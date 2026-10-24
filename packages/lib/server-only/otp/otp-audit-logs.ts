import { DocumentAuth } from '@documenso/lib/types/document-auth';
import { prisma } from '@documenso/prisma';

import { alphaid } from '../../universal/id';
import { computeAuditLogHash, normalizeForJsonb } from '../document-audit-log-hash';

/**
 * フェーズ2 ステップ8: OTP 関連の監査ログ記録
 *
 * OTP 送信・検証成功・失敗・ロックを DocumentAuditLog に記録する。
 * フェーズ1で導入済みのハッシュチェーン(document-audit-log-hash.ts)に乗る。
 *
 * **重要**: OTP 値そのものは決してログに記録しない(電子署名法・セキュリティ要件)。
 */

export const OTP_AUDIT_LOG_TYPES = {
  OTP_SENT: 'OTP_SENT',
  OTP_VERIFIED: 'OTP_VERIFIED',
  OTP_FAILED: 'OTP_FAILED',
  OTP_LOCKED: 'OTP_LOCKED',
} as const;

export type OtpAuditLogType = (typeof OTP_AUDIT_LOG_TYPES)[keyof typeof OTP_AUDIT_LOG_TYPES];

/**
 * OTP 関連の監査ログを記録する(ハッシュチェーン対応)。
 *
 * WORM 保証(Prisma 拡張 + DB トリガー)により DocumentAuditLog は UPDATE/DELETE 不可のため、
 * ハッシュは create 前に計算し、prevHash + hash を 1 回の insert で書き込む。
 */
export const recordOtpAuditLog = async ({
  envelopeId,
  recipientId,
  type,
  email,
  name,
  ipAddress,
  userAgent,
  attemptCount,
}: {
  envelopeId: string;
  recipientId: number;
  type: OtpAuditLogType;
  email?: string | null;
  name?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  attemptCount?: number;
}) => {
  // 直前レコードの hash を取得し、チェーンを継続させる
  const previous = await prisma.documentAuditLog.findFirst({
    where: { envelopeId },
    orderBy: { createdAt: 'desc' },
    select: { hash: true },
  });

  const data = {
    recipientId,
    authType: DocumentAuth.EMAIL_OTP,
    // 注意: OTP 値は含めない
    attemptCount: attemptCount ?? undefined,
  };

  // 監査ログは create 前にハッシュを計算して 1 回で書き込む(WORM トリガーは UPDATE/DELETE を禁止するため)。
  const logId = alphaid();
  const createdAt = new Date();
  const logData = normalizeForJsonb(data);
  const prevHash = previous?.hash ?? '';
  const hash = computeAuditLogHash({ id: logId, createdAt, type, data: logData }, prevHash);

  const log = await prisma.documentAuditLog.create({
    data: {
      id: logId,
      createdAt,
      envelopeId,
      type,
      data: logData,
      email: email ?? undefined,
      name: name ?? undefined,
      ipAddress: ipAddress ?? undefined,
      userAgent: userAgent ?? undefined,
      prevHash,
      hash,
    },
  });

  return { ...log, hash };
};
