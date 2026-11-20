import type { prisma } from '@documenso/prisma';
import type { DocumentAuditLog, Prisma } from '@documenso/prisma/client';
import type { TDocumentAuditLog } from '../../types/document-audit-logs';
import { alphaid } from '../../universal/id';
import type { CreateDocumentAuditLogDataOptions } from '../../utils/document-audit-logs';
import { createDocumentAuditLogData } from '../../utils/document-audit-logs';
import { computeAuditLogHash, normalizeForJsonb } from '../document-audit-log-hash';

type DbClient = Prisma.TransactionClient | typeof prisma;

export type CreateDocumentAuditLogOptions<T extends TDocumentAuditLog['type']> = CreateDocumentAuditLogDataOptions<T>;

/**
 * 監査ログ書き込み用 Advisory Lock キー (32bit 整数ペア)
 * 電帳法真実性要件: ハッシュチェーンのフォークを防ぐため、同一 envelopeId 単位で直列化
 */
const AUDIT_LOG_ADVISORY_LOCK_KEY = [0x44454e4b, 0x4945494b]; // "Denkei"

/**
 * 監査ログ書き込みの最大リトライ回数 (デッドロック/シリアル化失敗対策)
 */
const MAX_RETRY_COUNT = 3;

/**
 * 内部処理: Advisory Lock 取得後に直前ハッシュを取得して監査ログを作成
 *
 * PostgreSQL Advisory Lock (pg_advisory_xact_lock) を使用し、
 * FOR UPDATE 行ロックとは独立したセッションレベルの排他制御を実現する。
 * これにより、エンベロープ行が存在しない場合や、
 * 複数トランザクション間でのデッドロックを回避できる。
 */
const insertAuditLogWithHash = async <T extends TDocumentAuditLog['type']>(
  tx: Prisma.TransactionClient,
  options: CreateDocumentAuditLogOptions<T>,
  retryCount: number = 0,
): Promise<DocumentAuditLog> => {
  try {
    // 並行書き込み排他制御 (電帳法真実性要件):
    // Advisory Lock で同一 envelopeId 単位の書き込みを直列化し、
    // ハッシュチェーンのフォーク(分岐)を防ぐ。
    // Advisory Lock はトランザクションコミット/ロールバックで自動解放される。
    if (options.envelopeId) {
      // envelopeId から一意の lock キーを導出 (文字列ハッシュ)
      const lockKey = hashStringToInt32(options.envelopeId);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${AUDIT_LOG_ADVISORY_LOCK_KEY[0]}, ${lockKey})`;
    }

    const base = createDocumentAuditLogData(options);

    // 同一トランザクション内の未コミット行も参照するため、チェーンは連続する
    const previous = await tx.documentAuditLog.findFirst({
      where: { envelopeId: options.envelopeId },
      orderBy: { createdAt: 'desc' },
      select: { hash: true },
    });

    const id = alphaid();
    const createdAt = new Date();
    // jsonb 往復後の値と一致させるため、保存値もハッシュ計算入力も正規化済みオブジェクトを使用する
    const data = normalizeForJsonb(base.data);
    const prevHash = previous?.hash ?? '';
    const hash = computeAuditLogHash({ id, createdAt, type: base.type, data }, prevHash);

    return await tx.documentAuditLog.create({
      data: {
        ...base,
        id,
        createdAt,
        data,
        prevHash,
        hash,
      },
    });
  } catch (error: unknown) {
    // デッドロック (40P01) やシリアル化失敗 (40001) の場合はリトライ
    const pgErrorCode = (error as { code?: string })?.code;
    const isRetryable = pgErrorCode === '40P01' || pgErrorCode === '40001';

    if (isRetryable && retryCount < MAX_RETRY_COUNT) {
      // 指数バックオフでリトライ (簡易実装: 即座にリトライ)
      return await insertAuditLogWithHash(tx, options, retryCount + 1);
    }

    throw error;
  }
};

/**
 * 文字列を 32bit 符号付き整数に変換して Advisory Lock キーの第二要素として使用する。
 *
 * 注意: 簡易ハッシュのため衝突の可能性がある。衝突時は異なる envelopeId が
 * 同一 lockKey にマッピングされ、一時的に過剰直列化されるが、ハッシュチェーンの
 * 整合性（フォーク防止）には影響しない。lockKey は排他の粒度を「envelopeId 単位
 * 以上に細かくしない」ための手段であり、逆写像は不要。
 *
 * 同一文字列は常に同じ整数にマッピングされる。
 */
const hashStringToInt32 = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 32bit 整数に変換
  }
  return hash;
};

/**
 * C-2: 監査ログをハッシュチェーンに乗せて 1 回の insert で書き込む。
 *
 * WORM 保証(Prisma 拡張 + DB トリガー)により DocumentAuditLog は UPDATE/DELETE 不可のため、
 * hash は create 前に計算し、prevHash とともに insert に含める。
 *
 * - envelopeId 単位で直前レコードの hash を prevHash とする(先頭は '')
 * - data は jsonb 保存順(キー長→バイト順)に正規化してからハッシュ計算する
 * - id / createdAt もハッシュ対象のため、ここで生成して create に含める
 * - 同一 envelopeId に対する並行書き込み時はトランザクション行ロックで直列化する
 *
 * @param db prisma クライアントまたはトランザクションクライアント
 */
export const createDocumentAuditLog = async <T extends TDocumentAuditLog['type']>(
  db: DbClient,
  options: CreateDocumentAuditLogOptions<T>,
): Promise<DocumentAuditLog> => {
  // すでにトランザクションクライアント (tx) の場合はそのまま実行
  const isTransactionClient = !('$transaction' in db) || typeof (db as typeof prisma).$transaction !== 'function';

  if (isTransactionClient) {
    return await insertAuditLogWithHash(db as Prisma.TransactionClient, options);
  }

  // 通常の Prisma クライアントの場合はトランザクションを張って排他実行
  return await (db as typeof prisma).$transaction(async (tx) => {
    return await insertAuditLogWithHash(tx, options);
  });
};
