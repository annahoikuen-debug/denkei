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
 * PostgreSQL jsonb はオブジェクトキーを「キー長 → バイト順」で並べ替えて保存する。
 * ハッシュは create 前に計算するため、DB から読み戻した値(verifyAuditLogHashChain)と
 * 一致させるよう、ハッシュ計算入力を jsonb と同じ順序へ正規化する。
 */
export const normalizeForJsonb = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(normalizeForJsonb);
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => {
      if (a.length !== b.length) {
        return a.length - b.length;
      }

      return a < b ? -1 : a > b ? 1 : 0;
    });

    return Object.fromEntries(entries.map(([key, item]) => [key, normalizeForJsonb(item)]));
  }

  return value;
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
