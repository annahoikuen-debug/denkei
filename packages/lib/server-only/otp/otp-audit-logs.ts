import { DocumentAuth } from '@documenso/lib/types/document-auth';
import { prisma } from '@documenso/prisma';

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

    const { computeAuditLogHash } = await import('../document-audit-log-hash');

    const data = {
        recipientId,
        authType: DocumentAuth.EMAIL_OTP,
        // 注意: OTP 値は含めない
        attemptCount: attemptCount ?? undefined,
    };

    const log = await prisma.documentAuditLog.create({
        data: {
            envelopeId,
            type,
            data,
            email: email ?? undefined,
            name: name ?? undefined,
            ipAddress: ipAddress ?? undefined,
            userAgent: userAgent ?? undefined,
            prevHash: previous?.hash ?? '',
        },
    });

    // ハッシュを計算して保存
    const hash = computeAuditLogHash(log, log.prevHash);

    await prisma.documentAuditLog.update({
        where: { id: log.id },
        data: { hash },
    });

    return { ...log, hash };
};
