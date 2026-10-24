import { DocumentAuth } from '@documenso/lib/types/document-auth';
import { prisma } from '@documenso/prisma';
import type { Envelope, Recipient } from '@prisma/client';

import { extractDocumentAuthMethods } from '../../utils/document-auth';
import {
  generateOtp,
  getOtpExpiry,
  hashOtp,
  isResendAllowed,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
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

export type IssueOtpResult =
  | { success: true; otpCode: string; expiresAt: Date }
  | { success: false; reason: 'rate-limited' };

/**
 * 署名画面 OTP ゲートの表示に使う状態。
 */
export type RecipientOtpGateState = {
  maxAttempts: number;
  remainingAttempts: number;
  /** 残り再送クールダウン秒数(0 = 再送可) */
  cooldownSeconds: number;
  isLocked: boolean;
  /** 未検証トークンを含め、OTP トークンが 1 件以上存在するか */
  hasToken: boolean;
};

/**
 * OTP を発行し、対象 recipient のトークンを新規作成する。
 * 既存の未検証トークンは無効化(削除)する。
 *
 * 返り値の otpCode はメール送信ジョブへ渡すための平文コード。
 * 監査ログ・クライアントへは絶対に返さないこと(サーバー内部専用)。
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

  return { success: true, otpCode: otp, expiresAt: created.expiresAt };
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
    // 試行回数は DB 側の increment で加算する(並列リクエストでのすり抜け防止)。
    const updatedToken = await prisma.recipientVerificationToken.update({
      where: { id: token.id },
      data: {
        attemptCount: { increment: 1 },
      },
    });

    if (shouldLockOtp(updatedToken.attemptCount) && !updatedToken.lockedAt) {
      await prisma.recipientVerificationToken.update({
        where: { id: token.id },
        data: { lockedAt: now },
      });
    }
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

/**
 * OTP ゲートの表示状態を返す(直近トークンの有無・残試行・ロック・再送クールダウン)。
 */
export const getRecipientOtpGateState = async ({
  recipientId,
  now = new Date(),
}: {
  recipientId: number;
  now?: Date;
}): Promise<RecipientOtpGateState> => {
  const latestToken = await prisma.recipientVerificationToken.findFirst({
    where: { recipientId, authType: DocumentAuth.EMAIL_OTP },
    orderBy: { createdAt: 'desc' },
  });

  if (!latestToken) {
    return {
      maxAttempts: OTP_MAX_ATTEMPTS,
      remainingAttempts: OTP_MAX_ATTEMPTS,
      cooldownSeconds: 0,
      isLocked: false,
      hasToken: false,
    };
  }

  const cooldownExpiresAt = latestToken.createdAt.getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000;

  return {
    maxAttempts: OTP_MAX_ATTEMPTS,
    remainingAttempts: Math.max(0, OTP_MAX_ATTEMPTS - latestToken.attemptCount),
    cooldownSeconds: cooldownExpiresAt > now.getTime() ? Math.ceil((cooldownExpiresAt - now.getTime()) / 1000) : 0,
    isLocked: latestToken.lockedAt !== null || latestToken.attemptCount >= OTP_MAX_ATTEMPTS,
    hasToken: true,
  };
};

/**
 * OTP 検証要求を対象の recipient へ紐付ける。
 *
 * 受け取れるトークン:
 * - 署名リンク(Recipient.token)
 * - direct リンク(Envelope.directLink.token)
 */
export const getOtpVerificationContextForToken = async ({
  token,
}: {
  token: string;
}): Promise<{
  recipient: Pick<Recipient, 'id' | 'email' | 'name' | 'envelopeId'>;
  envelopeId: string;
  /** 設定上 EMAIL_OTP による本人確認が必要か */
  isOtpRequired: boolean;
  isOtpVerified: boolean;
  gateState: RecipientOtpGateState;
} | null> => {
  const resolveRecipient = async (): Promise<{
    recipient: Pick<Recipient, 'id' | 'email' | 'name' | 'envelopeId'>;
    documentAuthOptions: Envelope['authOptions'];
    recipientAuthOptions: Recipient['authOptions'];
  } | null> => {
    const directRecipient = await prisma.recipient.findFirst({
      where: { token },
      select: {
        id: true,
        email: true,
        name: true,
        envelopeId: true,
        authOptions: true,
        envelope: {
          select: {
            authOptions: true,
          },
        },
      },
    });

    if (directRecipient) {
      return {
        recipient: directRecipient,
        documentAuthOptions: directRecipient.envelope.authOptions,
        recipientAuthOptions: directRecipient.authOptions,
      };
    }

    const directLinkEnvelope = await prisma.envelope.findFirst({
      where: {
        directLink: {
          enabled: true,
          token,
        },
      },
      select: {
        id: true,
        authOptions: true,
        directLink: {
          select: {
            directTemplateRecipientId: true,
          },
        },
        recipients: {
          select: {
            id: true,
            email: true,
            name: true,
            envelopeId: true,
            authOptions: true,
          },
        },
      },
    });

    const directTemplateRecipient = directLinkEnvelope?.recipients.find(
      (recipient) => recipient.id === directLinkEnvelope.directLink?.directTemplateRecipientId,
    );

    if (!directLinkEnvelope || !directTemplateRecipient) {
      return null;
    }

    return {
      recipient: directTemplateRecipient,
      documentAuthOptions: directLinkEnvelope.authOptions,
      recipientAuthOptions: directTemplateRecipient.authOptions,
    };
  };

  const resolved = await resolveRecipient();

  if (!resolved) {
    return null;
  }

  const { derivedRecipientAccessAuth } = extractDocumentAuthMethods({
    documentAuth: resolved.documentAuthOptions,
    recipientAuth: resolved.recipientAuthOptions,
  });

  const [isOtpVerified, gateState] = await Promise.all([
    hasVerifiedRecipientOtp({ recipientId: resolved.recipient.id }),
    getRecipientOtpGateState({ recipientId: resolved.recipient.id }),
  ]);

  return {
    recipient: resolved.recipient,
    envelopeId: resolved.recipient.envelopeId,
    isOtpRequired: derivedRecipientAccessAuth.includes(DocumentAuth.EMAIL_OTP),
    isOtpVerified,
    gateState,
  };
};
