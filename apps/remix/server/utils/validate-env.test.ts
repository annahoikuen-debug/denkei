import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { validateRequiredEnv } from './validate-env';

describe('validateRequiredEnv', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // 各テスト前に環境変数を退避
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('isTest: true または NODE_ENV=test の場合はバリデーションをスキップする', () => {
    // 必須環境変数が未設定
    delete (process.env as Record<string, string | undefined>).NEXTAUTH_SECRET;
    delete (process.env as Record<string, string | undefined>).NEXT_PRIVATE_ENCRYPTION_KEY;
    delete (process.env as Record<string, string | undefined>).NEXT_PRIVATE_DATABASE_URL;

    // 例外がスローされないこと
    expect(() => validateRequiredEnv({ isTest: true })).not.toThrow();
  });

  it('全必須環境変数が設定されている場合は正常終了する', () => {
    process.env.NEXTAUTH_SECRET = 'test-secret-at-least-32-chars-long-abcdef';
    process.env.NEXT_PRIVATE_ENCRYPTION_KEY = 'test-key-at-least-32-chars-long-abcdef';
    process.env.NEXT_PRIVATE_DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

    expect(() => validateRequiredEnv({ isTest: false, exitOnFailure: false })).not.toThrow();
  });

  it('必須環境変数が欠落しており exitOnFailure: false の場合、不足変数名を含む例外をスローする', () => {
    delete (process.env as Record<string, string | undefined>).NEXTAUTH_SECRET;
    process.env.NEXT_PRIVATE_ENCRYPTION_KEY = 'valid-key';
    delete (process.env as Record<string, string | undefined>).NEXT_PRIVATE_DATABASE_URL;

    expect(() => validateRequiredEnv({ isTest: false, exitOnFailure: false })).toThrowError(
      /NEXTAUTH_SECRET.*NEXT_PRIVATE_DATABASE_URL/,
    );
  });

  it('必須環境変数が欠落しており exitOnFailure: true の場合、process.exit(1) を呼び出す', () => {
    delete (process.env as Record<string, string | undefined>).NEXTAUTH_SECRET;
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    validateRequiredEnv({ isTest: false, exitOnFailure: true });

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
