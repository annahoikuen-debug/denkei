import { match } from 'ts-pattern';

/**
 * フェーズ2 ステップ10〜11: 本人確認プロバイダの抽象化層
 *
 * 認証レベル:
 * - LOW    = メールOTP(自社実装)
 * - MEDIUM = Firebase Authentication (Google) のメール認証(メールリンク)
 * - HIGH   = eKYC(外部 API・オプション)
 *
 * SMS 認証プロバイダは意図的に実装しない(計画書の要件)。
 * 将来的に Google アカウントサインインへ同一基盤で拡張可能な設計。
 *
 * プロバイダは env(NEXT_PRIVATE_IDENTITY_PROVIDER)で切替:
 * - 'otp'(既定)      : 自社メールOTP
 * - 'firebase-email' : Firebase Authentication メール認証
 * - 'mock'           : 開発/テスト用モック(Firebase Emulator の代替)
 */

export type IdentityVerificationLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type IdentityVerificationProviderType = 'otp' | 'firebase-email' | 'mock';

export type SendVerificationRequest = {
  recipientId: number;
  envelopeId: string;
  email: string;
  documentName: string;
  level: IdentityVerificationLevel;
};

export type SendVerificationResult =
  | { success: true; expiresAt: Date }
  | { success: false; reason: 'rate-limited' | 'quota-exceeded-fallback' | 'unsupported' };

export type VerifyVerificationRequest = {
  recipientId: number;
  code?: string; // OTP 用
  sessionIdentifier?: string; // Firebase メールリンク検証済みセッション用
};

export type VerifyVerificationResult = {
  status: 'success' | 'invalid' | 'expired' | 'locked' | 'consumed' | 'malformed' | 'unknown';
  level?: IdentityVerificationLevel;
};

export interface IIdentityVerificationProvider {
  readonly type: IdentityVerificationProviderType;
  readonly level: IdentityVerificationLevel;

  sendVerification(request: SendVerificationRequest): Promise<SendVerificationResult>;
  verify(request: VerifyVerificationRequest): Promise<VerifyVerificationResult>;
  hasVerifiedSession(request: { recipientId: number }): Promise<boolean>;
}

/**
 * env から現在のプロバイダタイプを取得する。
 */
export const getIdentityVerificationProviderType = (): IdentityVerificationProviderType => {
  return match(process.env.NEXT_PRIVATE_IDENTITY_PROVIDER)
    .with('firebase-email', () => 'firebase-email' as const)
    .with('mock', () => 'mock' as const)
    .otherwise(() => 'otp' as const);
};

/**
 * Firebase メール認証プロバイダ(MEDIUM)。
 * firebase-admin SDK の import は遅延読み込み(未導入環境でクラッシュしないよう)。
 */
export class FirebaseEmailVerificationProvider implements IIdentityVerificationProvider {
  readonly type = 'firebase-email' as const;
  readonly level = 'MEDIUM' as const;

  async sendVerification(request: SendVerificationRequest): Promise<SendVerificationResult> {
    // 遅延 import: firebase-admin が未インストールの環境では発生しない
    const { buildEmailLink } = await import('./firebase-admin-client');

    const result = await buildEmailLink(request.email);

    if (!result.success) {
      // Firebase 送信失敗時はメール OTP へフォールバック(ステップ11)
      const { issueRecipientOtp } = await import('./recipient-verification');

      const otpResult = await issueRecipientOtp({
        recipientId: request.recipientId,
        envelopeId: request.envelopeId,
      });

      if (otpResult.success) {
        return { success: true, expiresAt: otpResult.expiresAt };
      }

      return { success: false, reason: 'rate-limited' };
    }

    return { success: true, expiresAt: result.expiresAt };
  }

  async verify(request: VerifyVerificationRequest): Promise<VerifyVerificationResult> {
    if (!request.sessionIdentifier) {
      return { status: 'malformed' };
    }

    const { verifyFirebaseSession } = await import('./firebase-admin-client');

    const result = await verifyFirebaseSession(request.sessionIdentifier);

    if (!result.valid) {
      return { status: 'invalid', level: this.level };
    }

    return { status: 'success', level: this.level };
  }

  async hasVerifiedSession(request: { recipientId: number }): Promise<boolean> {
    const { hasVerifiedRecipientOtp } = await import('./recipient-verification');

    return hasVerifiedRecipientOtp({ recipientId: request.recipientId });
  }
}

/**
 * モックプロバイダ(開発/テスト用)。Firebase Emulator の代替。
 * コード '000000' または任意の sessionIdentifier で成功する。
 */
export class MockVerificationProvider implements IIdentityVerificationProvider {
  readonly type = 'mock' as const;
  readonly level = 'MEDIUM' as const;

  async sendVerification(_request: SendVerificationRequest): Promise<SendVerificationResult> {
    return { success: true, expiresAt: new Date(Date.now() + 10 * 60 * 1000) };
  }

  async verify(request: VerifyVerificationRequest): Promise<VerifyVerificationResult> {
    if (request.sessionIdentifier) {
      return { status: 'success', level: this.level };
    }

    if (request.code === '000000') {
      return { status: 'success', level: this.level };
    }

    return { status: 'invalid', level: this.level };
  }

  // eslint-disable-next-line require-await
  async hasVerifiedSession(_request: { recipientId: number }): Promise<boolean> {
    return true; // モックは常に検証済み扱い
  }
}

/**
 * プロバイダファクトリ(env 切替)。
 */
export const getIdentityVerificationProvider = (
  type: IdentityVerificationProviderType = getIdentityVerificationProviderType(),
): IIdentityVerificationProvider => {
  return match(type)
    .with('firebase-email', () => new FirebaseEmailVerificationProvider())
    .with('mock', () => new MockVerificationProvider())
    .with('otp', () => new OtpVerificationProvider())
    .exhaustive();
};

/**
 * メールOTP プロバイダ(LOW)。既存 recipient-verification をラップする。
 */
export class OtpVerificationProvider implements IIdentityVerificationProvider {
  readonly type = 'otp' as const;
  readonly level = 'LOW' as const;

  async sendVerification(request: SendVerificationRequest): Promise<SendVerificationResult> {
    const { issueRecipientOtp } = await import('./recipient-verification');

    const result = await issueRecipientOtp({
      recipientId: request.recipientId,
      envelopeId: request.envelopeId,
    });

    if (!result.success) {
      return { success: false, reason: 'rate-limited' };
    }

    return { success: true, expiresAt: result.expiresAt };
  }

  async verify(request: VerifyVerificationRequest): Promise<VerifyVerificationResult> {
    const { verifyRecipientOtp } = await import('./recipient-verification');

    if (!request.code) {
      return { status: 'malformed' };
    }

    const result = await verifyRecipientOtp({
      recipientId: request.recipientId,
      inputOtp: request.code,
    });

    return { ...result, level: this.level };
  }

  async hasVerifiedSession(request: { recipientId: number }): Promise<boolean> {
    const { hasVerifiedRecipientOtp } = await import('./recipient-verification');

    return hasVerifiedRecipientOtp({ recipientId: request.recipientId });
  }
}
