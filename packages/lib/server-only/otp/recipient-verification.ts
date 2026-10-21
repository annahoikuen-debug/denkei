import { DocumentAuth } from '@documenso/lib/types/document-auth';
import { prisma } from '@documenso/prisma';

import {
  generateOtp,
  getOtpExpiry,
  hashOtp,
  isResendAllowed,
  type OtpVerificationResult,
  shouldLockOtp,
  verifyOtp,
} from './otp';

/**
 * フェーズ2 ステップ7: OTP 検証サーバーロジック
 *
 * RecipientVerificationToken を用いた OTP 発行・検証・ロックのライフサイクル管理。
 * 検証成功でトークンを consumed にし、署名セッションの発行根拠とする。
 */

export type IssueOtpResult = { success: true; expiresAt: Date } | { success: false; reason: 'rate-limited' };

/**
 * OTP を発行し、対象 recipient のトークンを新規作成する。
 * 既存の未検証トークンは無効化(削除)する。
 */
export const issueRecipientOtp = async ({
  recipientId,
  envelopeId: _envelopeId,
  now = new Date(),
}: {
  recipientId: number;
  envelopeId: string;
  now?: Date;
}): Promise<IssueOtpResult> => {
  // 直近トークンのクールダウン確認
  const latestToken = await prisma.recipientVerificationToken.findFirst({
    where: { recipientId, authType: DocumentAuth.EMAIL_OTP },
    orderBy: { createdAt: 'desc' },
  });

  if (!isResendAllowed(latestToken?.createdAt, now)) {
    return { success: false, reason: 'rate-limited' };
  }

  const otp = generateOtp();

  await prisma.recipientVerificationToken.deleteMany({
    where: { recipientId, authType: DocumentAuth.EMAIL_OTP, consumedAt: null },
  });

  const created = await prisma.recipientVerificationToken.create({
    data: {
      recipientId,
      authType: DocumentAuth.EMAIL_OTP,
      tokenHash: hashOtp(otp),
      expiresAt: getOtpExpiry(now),
    },
  });

  return { success: true, expiresAt: created.expiresAt };
};

/**
 * OTP 入力を検証する。
 * - 成功: トークンを consumed にする
 * - 失敗: 試行回数を +1 し、上限でロック
 * OTP 値自体は監査ログに記録しないこと(ステップ8)。
 */
export const verifyRecipientOtp = async ({
  recipientId,
  inputOtp,
  now = new Date(),
}: {
  recipientId: number;
  inputOtp: string;
  now?: Date;
}): Promise<OtpVerificationResult> => {
  const token = await prisma.recipientVerificationToken.findFirst({
    where: { recipientId, authType: DocumentAuth.EMAIL_OTP, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!token) {
    return { status: 'expired' };
  }

  const result = verifyOtp({
    inputOtp,
    storedHash: token.tokenHash,
    attemptCount: token.attemptCount,
    expiresAt: token.expiresAt,
    lockedAt: token.lockedAt,
    consumedAt: token.consumedAt,
  });

  if (result.status === 'success') {
    await prisma.recipientVerificationToken.update({
      where: { id: token.id },
      data: { consumedAt: now },
    });

    return result;
  }

  if (result.status === 'invalid') {
    const newAttemptCount = token.attemptCount + 1;

    await prisma.recipientVerificationToken.update({
      where: { id: token.id },
      data: {
        attemptCount: newAttemptCount,
        ...(shouldLockOtp(newAttemptCount) ? { lockedAt: now } : {}),
      },
    });
  }

  return result;
};

/**
 * OTP 検証済みセッションの発行根拠を確認する(consumed トークンの存在確認)。
 * 署名ゲートの解除判定に使用する。
 */
export const hasVerifiedRecipientOtp = async ({ recipientId }: { recipientId: number }): Promise<boolean> => {
  const token = await prisma.recipientVerificationToken.findFirst({
    where: {
      recipientId,
      authType: DocumentAuth.EMAIL_OTP,
      consumedAt: { not: null },
      lockedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  });

  return token !== null;
};
