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
 * C-2: 監査ログをハッシュチェーンに乗せて 1 回の insert で書き込む。
 *
 * WORM 保証(Prisma 拡張 + DB トリガー)により DocumentAuditLog は UPDATE/DELETE 不可のため、
 * hash は create 前に計算し、prevHash とともに insert に含める。
 *
 * - envelopeId 単位で直前レコードの hash を prevHash とする(先頭は '')
 * - data は jsonb 保存順(キー長→バイト順)に正規化してからハッシュ計算する
 * - id / createdAt もハッシュ対象のため、ここで生成して create に含める
 *
 * @param db prisma クライアントまたはトランザクションクライアント
 */
export const createDocumentAuditLog = async <T extends TDocumentAuditLog['type']>(
  db: DbClient,
  options: CreateDocumentAuditLogOptions<T>,
): Promise<DocumentAuditLog> => {
  const base = createDocumentAuditLogData(options);

  // 同一トランザクション内の未コミット行も参照するため、チェーンは連続する
  const previous = await db.documentAuditLog.findFirst({
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

  return db.documentAuditLog.create({
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
