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
 * 内部処理: 行ロック取得後に直前ハッシュを取得して監査ログを作成
 */
const insertAuditLogWithHash = async <T extends TDocumentAuditLog['type']>(
  tx: Prisma.TransactionClient,
  options: CreateDocumentAuditLogOptions<T>,
): Promise<DocumentAuditLog> => {
  // 並行書き込み排他制御 (電帳法真実性要件):
  // 同一エンベロープで並行アクセス(複数署名者の同時署名、Webhook等)が発生した際、
  // 直前ログの取得(findFirst)と作成が重複してハッシュチェーンがフォーク(分岐)するのを防ぐため、
  // 親エンベロープ行を FOR UPDATE で排他ロックする。
  if (options.envelopeId) {
    try {
      await tx.$executeRaw`SELECT id FROM "Envelope" WHERE id = ${options.envelopeId} FOR UPDATE`;
    } catch {
      // FOR UPDATE をサポートしない DB (テスト環境等) ではフォールバック
    }
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
