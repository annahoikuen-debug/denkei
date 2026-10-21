import { createHash } from 'node:crypto';

/**
 * フェーズ1 ステップ32: 監査ログのハッシュチェーン
 *
 * - 各レコードは SHA-256(prevHash + ペイロード) を hash として持つ
 * - prevHash は同一エンベロープ内の直前レコードの hash(最初のレコードは空文字)
 * - 連続性検証で改変(挿入・削除・改ざん)を検知できる
 */

export type AuditLogHashChainEntry = {
  id: string;
  createdAt: Date | string;
  type: string;
  data: unknown;
  name?: string | null;
  email?: string | null;
  userId?: number | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  prevHash?: string | null;
  hash?: string | null;
};

/**
 * チェーンペイロードの正規化文字列を生成する。
 */
export const buildAuditLogPayload = (
  entry: Pick<AuditLogHashChainEntry, 'id' | 'createdAt' | 'type' | 'data'>,
): string => {
  return JSON.stringify({
    id: entry.id,
    createdAt: entry.createdAt instanceof Date ? entry.createdAt.toISOString() : entry.createdAt,
    type: entry.type,
    data: entry.data ?? null,
  });
};

/**
 * レコードの hash を計算する。
 *
 * @param prevHash 直前レコードの hash(チェーン先頭は '' または null)
 */
export const computeAuditLogHash = (
  entry: Pick<AuditLogHashChainEntry, 'id' | 'createdAt' | 'type' | 'data'>,
  prevHash: string | null | undefined,
): string => {
  return createHash('sha256')
    .update(`${prevHash ?? ''}|${buildAuditLogPayload(entry)}`)
    .digest('hex');
};

/**
 * ハッシュチェーンの連続性を検証する。
 *
 * @returns 検証結果。isValid = false の場合は破損位置(breakAtId)を返す。
 */
export const verifyAuditLogHashChain = (
  entries: AuditLogHashChainEntry[],
): { isValid: boolean; breakAtId?: string } => {
  let expectedPrevHash = '';

  for (const entry of entries) {
    if (!entry.hash) {
      return { isValid: false, breakAtId: entry.id };
    }

    if ((entry.prevHash ?? '') !== expectedPrevHash) {
      return { isValid: false, breakAtId: entry.id };
    }

    const computed = computeAuditLogHash(entry, entry.prevHash);

    if (computed !== entry.hash) {
      return { isValid: false, breakAtId: entry.id };
    }

    expectedPrevHash = entry.hash;
  }

  return { isValid: true };
};
