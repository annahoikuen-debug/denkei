import { prisma } from '@documenso/prisma';

/**
 * フェーズ2 ステップ19: 1トークン1アクティブセッション制御
 *
 * 同一署名トークンの同時アクセスを制御する。
 * - セッション開始時に既存のアクティブセッションを失効させる(後勝ち)
 * - セッション失効には猶予時間(GRACE_PERIOD_SECONDS)を設け、
 *   同一ユーザーの再接続(リロード等)はシームレスに再開できる
 *
 * セッション識別子はトークン+ブラウザ固有値のハッシュで管理し、
 * RecipientVerificationToken とは独立したレコードとして保持する
 * (authType に 'SIGNING_SESSION' を使用して区別)。
 */

const SIGNING_SESSION_AUTH_TYPE = 'SIGNING_SESSION';

/** セッション失効の猶予時間(秒)。リロード・短時間の再接続を許容する。 */
export const SESSION_GRACE_PERIOD_SECONDS = 180;

/**
 * 署名セッションを開始する。
 * 既存のアクティブセッション(猶予時間を超過したもの)を無効化する。
 *
 * @returns セッション識別子
 */
export const startSigningSession = async ({
  recipientId,
  sessionKey,
  now = new Date(),
}: {
  recipientId: number;
  /** トークン+デバイス識別子のハッシュ */
  sessionKey: string;
  now?: Date;
}): Promise<string> => {
  const graceCutoff = new Date(now.getTime() - SESSION_GRACE_PERIOD_SECONDS * 1000);

  // 猶予時間を超えた古いセッションを失効(consumedAt 設定)
  await prisma.recipientVerificationToken.updateMany({
    where: {
      recipientId,
      authType: SIGNING_SESSION_AUTH_TYPE,
      consumedAt: null,
      createdAt: { lt: graceCutoff },
    },
    data: { consumedAt: now },
  });

  const session = await prisma.recipientVerificationToken.create({
    data: {
      recipientId,
      authType: SIGNING_SESSION_AUTH_TYPE,
      tokenHash: sessionKey,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24時間
    },
  });

  return session.id;
};

/**
 * セッションがアクティブかを判定する。
 * 猶予時間内の同一セッションキーは再開(アクティブ)扱い。
 */
export const isSigningSessionActive = async ({
  recipientId,
  sessionKey,
  now = new Date(),
}: {
  recipientId: number;
  sessionKey: string;
  now?: Date;
}): Promise<boolean> => {
  const graceCutoff = new Date(now.getTime() - SESSION_GRACE_PERIOD_SECONDS * 1000);

  const activeSession = await prisma.recipientVerificationToken.findFirst({
    where: {
      recipientId,
      authType: SIGNING_SESSION_AUTH_TYPE,
      tokenHash: sessionKey,
      consumedAt: null,
      createdAt: { gte: graceCutoff },
      expiresAt: { gte: now },
    },
  });

  return activeSession !== null;
};
