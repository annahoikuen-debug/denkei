import { describe, expect, it } from 'vitest';

import {
  getIdentityVerificationProvider,
  getIdentityVerificationProviderType,
  MockVerificationProvider,
  OtpVerificationProvider,
} from './identity-verification-provider';

describe('identity verification provider(フェーズ2 ステップ10)', () => {
  it('既定は otp プロバイダ', () => {
    delete process.env.NEXT_PRIVATE_IDENTITY_PROVIDER;

    expect(getIdentityVerificationProviderType()).toBe('otp');
  });

  it('env で firebase-email に切替できる', () => {
    process.env.NEXT_PRIVATE_IDENTITY_PROVIDER = 'firebase-email';

    expect(getIdentityVerificationProviderType()).toBe('firebase-email');

    delete process.env.NEXT_PRIVATE_IDENTITY_PROVIDER;
  });

  it('env で mock に切替できる', () => {
    process.env.NEXT_PRIVATE_IDENTITY_PROVIDER = 'mock';

    expect(getIdentityVerificationProviderType()).toBe('mock');

    delete process.env.NEXT_PRIVATE_IDENTITY_PROVIDER;
  });

  it('ファクトリが各プロバイダを返す', () => {
    expect(getIdentityVerificationProvider('otp')).toBeInstanceOf(OtpVerificationProvider);
    expect(getIdentityVerificationProvider('mock')).toBeInstanceOf(MockVerificationProvider);
    expect(getIdentityVerificationProvider('firebase-email')).toBeTruthy();
  });

  it('モックプロバイダはコード 000000 で検証成功', async () => {
    const provider = new MockVerificationProvider();

    expect(await provider.verify({ recipientId: 1, code: '000000' })).toMatchObject({
      status: 'success',
    });

    expect(await provider.verify({ recipientId: 1, code: '111111' })).toMatchObject({
      status: 'invalid',
    });
  });
});
