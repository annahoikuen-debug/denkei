import { randomBytes } from 'node:crypto';

import { prisma } from '@documenso/prisma';

/**
 * フェーズ2 ステップ16・17: 署名トークンのライフサイクル管理
 *
 * - ステップ16: 再送時のトークンローテーション(旧トークン即時無効化)
 * - ステップ17: 署名完了後の全 recipient トークン失効
 */

/**
 * セキュアな署名トークンを生成する(cuid ではなく crypto ランダム32バイト)。
 */
export const generateSecureRecipientToken = (): string => {
  return randomBytes(32).toString('base64url');
};

/**
 * 再送時に recipient トークンを再生成する(ローテーション)。
 * 旧トークンは URL が変わることで即時無効化される。
 */
export const rotateRecipientToken = async ({ recipientId }: { recipientId: number }) => {
  const newToken = generateSecureRecipientToken();

  const recipient = await prisma.recipient.update({
    where: { id: recipientId },
    data: { token: newToken },
  });

  // ローテーション時に未検証の本人確認トークンも無効化
  await prisma.recipientVerificationToken.deleteMany({
    where: { recipientId, consumedAt: null },
  });

  return recipient;
};

/**
 * エンベロープ完了時に全 recipient トークンを失効させる。
 * seal-document 完了後に呼び出す。
 *
 * トークン自体は「完了済み」案内画面の表示に使うため、
 * DB では signedAt+envelope.status で判定し、ここでは検証済み本人確認トークンを失効させる。
 */
export const revokeAllRecipientVerificationTokens = async ({ envelopeId }: { envelopeId: string }) => {
  const recipients = await prisma.recipient.findMany({
    where: { envelopeId },
    select: { id: true },
  });

  await prisma.recipientVerificationToken.deleteMany({
    where: {
      recipientId: { in: recipients.map((r) => r.id) },
    },
  });

  return recipients.length;
};

/**
 * 完了済みエンベロープのトークンアクセスかどうかを判定する。
 * 「完了済み」案内画面への誘導に使用する(ステップ17)。
 */
export const isTokenForCompletedEnvelope = async ({ token }: { token: string }) => {
  const recipient = await prisma.recipient.findFirst({
    where: { token },
    include: { envelope: { select: { status: true } } },
  });

  if (!recipient) {
    return { exists: false, isCompleted: false };
  }

  return {
    exists: true,
    isCompleted: recipient.envelope.status === 'COMPLETED',
  };
};
