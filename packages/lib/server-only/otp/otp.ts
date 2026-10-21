import { createHash, randomInt } from 'node:crypto';

/**
 * フェーズ2 ステップ4: メールOTP(LOW レベル本人確認)ユーティリティ
 *
 * - 6桁 OTP を crypto.randomInt で生成(000000〜999999)
 * - SHA-256 ハッシュで保存(平文保存しない)
 * - 有効期限: 既定 10分
 * - 最大試行回数: 5回(超過でロック)
 * - 再送クールダウン: 60秒
 */

export const OTP_LENGTH = 6;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_EXPIRY_SECONDS = 10 * 60; // 10分
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

/**
 * 6桁の OTP を生成する。先頭ゼロを保持するため文字列で返す。
 */
export const generateOtp = (): string => {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');
};

/**
 * OTP を SHA-256 ハッシュ化する(保存用)。
 */
export const hashOtp = (otp: string): string => {
  return createHash('sha256').update(otp, 'utf8').digest('hex');
};

/**
 * OTP の有効期限日時を返す。
 */
export const getOtpExpiry = (from: Date = new Date()): Date => {
  return new Date(from.getTime() + OTP_EXPIRY_SECONDS * 1000);
};

/**
 * 再送クールダウンが解除されているか判定する。
 *
 * @param lastSentAt 直近の送信日時。null の場合はクールダウンなし。
 */
export const isResendAllowed = (lastSentAt: Date | null | undefined, now: Date = new Date()): boolean => {
  if (!lastSentAt) {
    return true;
  }

  return now.getTime() - lastSentAt.getTime() >= OTP_RESEND_COOLDOWN_SECONDS * 1000;
};

export type OtpVerificationInput = {
  /** 平文入力 OTP */
  inputOtp: string;
  /** 保存済みハッシュ */
  storedHash: string;
  /** 試行回数(検証前) */
  attemptCount: number;
  expiresAt: Date;
  lockedAt?: Date | null;
  consumedAt?: Date | null;
};

export type OtpVerificationResult =
  | { status: 'success' }
  | { status: 'expired' }
  | { status: 'locked' }
  | { status: 'consumed' }
  | { status: 'invalid' }
  | { status: 'malformed' };

/**
 * OTP 入力を検証する。
 * 成功・失敗ともに呼び出し側で試行回数のインクリメント・ロック処理を行う。
 */
export const verifyOtp = (input: OtpVerificationInput): OtpVerificationResult => {
  if (!/^\d{6}$/.test(input.inputOtp)) {
    return { status: 'malformed' };
  }

  if (input.lockedAt) {
    return { status: 'locked' };
  }

  if (input.consumedAt) {
    return { status: 'consumed' };
  }

  if (input.expiresAt.getTime() < Date.now()) {
    return { status: 'expired' };
  }

  if (input.attemptCount >= OTP_MAX_ATTEMPTS) {
    return { status: 'locked' };
  }

  if (hashOtp(input.inputOtp) !== input.storedHash) {
    return { status: 'invalid' };
  }

  return { status: 'success' };
};

/**
 * 試行回数が上限に達したか(= ロックすべきか)を返す。
 */
export const shouldLockOtp = (newAttemptCount: number): boolean => {
  return newAttemptCount >= OTP_MAX_ATTEMPTS;
};
