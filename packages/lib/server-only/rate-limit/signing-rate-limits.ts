import { createRateLimit } from './rate-limit';

/**
 * フェーズ2 ステップ21: 署名フロー向けレート制限設定
 *
 * 既存 createRateLimit(バケット型 DB カウンタ)を再利用し、
 * OTP 検証・署名リンクアクセスに適用する。
 *
 * しきい値(計画書どおり):
 * - OTP 検証: 5回/10分(IP+トークン単位)
 * - 署名リンクアクセス: 30回/分(IP 単位)
 */

/** OTP 検証: 5回/10分(IP + トークン identifier 単位) */
export const otpVerificationRateLimit = createRateLimit({
    action: 'signing.otp-verify',
    max: 5,
    window: '10m',
});

/** 署名リンクアクセス: 30回/分(IP 単位) */
export const signingLinkAccessRateLimit = createRateLimit({
    action: 'signing.link-access',
    max: 30,
    window: '1m',
});

/**
 * レート制限超過時のレスポンス用ユーティリティ。
 * ja エラーメッセージはフロント側 app-error-ja.ts の TOO_MANY_REQUESTS を使用する。
 */
export const isRateLimitedError = (error: unknown): boolean => {
    return (
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        (error as { status?: number }).status === 429
    );
};
