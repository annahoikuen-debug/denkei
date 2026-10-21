import { describe, expect, it } from 'vitest';

import {
  DocumentAuth,
  ZDocumentAuthMethodsSchema,
  ZRecipientAccessAuthSchema,
  ZRecipientActionAuthSchema,
} from './document-auth';

describe('ZDocumentAuthMethodsSchema(フェーズ2 ステップ2)', () => {
  it('既存タイプのパースは後方互換を維持する', () => {
    expect(ZDocumentAuthMethodsSchema.parse({ type: DocumentAuth.ACCOUNT })).toEqual({ type: 'ACCOUNT' });

    expect(ZDocumentAuthMethodsSchema.parse({ type: DocumentAuth.PASSWORD, password: 'secret' })).toEqual({
      type: 'PASSWORD',
      password: 'secret',
    });
  });

  it('EMAIL_OTP タイプ(6桁)をパースできる', () => {
    expect(ZDocumentAuthMethodsSchema.parse({ type: DocumentAuth.EMAIL_OTP, token: '123456' })).toEqual({
      type: 'EMAIL_OTP',
      token: '123456',
    });
  });

  it('EMAIL_OTP は6桁以外を拒否する', () => {
    expect(() => ZDocumentAuthMethodsSchema.parse({ type: DocumentAuth.EMAIL_OTP, token: '12345' })).toThrow();

    expect(() => ZDocumentAuthMethodsSchema.parse({ type: DocumentAuth.EMAIL_OTP, token: 'abcdef' })).toThrow();
  });

  it('FIREBASE_EMAIL タイプをパースできる', () => {
    expect(
      ZDocumentAuthMethodsSchema.parse({
        type: DocumentAuth.FIREBASE_EMAIL,
        sessionIdentifier: 'firebase-session-1',
      }),
    ).toEqual({ type: 'FIREBASE_EMAIL', sessionIdentifier: 'firebase-session-1' });
  });

  it('FIREBASE_EMAIL は空のセッション識別子を拒否する', () => {
    expect(() =>
      ZDocumentAuthMethodsSchema.parse({ type: DocumentAuth.FIREBASE_EMAIL, sessionIdentifier: '' }),
    ).toThrow();
  });

  it('RecipientActionAuth に新タイプが含まれる', () => {
    expect(ZRecipientActionAuthSchema.safeParse({ type: DocumentAuth.EMAIL_OTP, token: '123456' }).success).toBe(true);

    expect(
      ZRecipientActionAuthSchema.safeParse({
        type: DocumentAuth.FIREBASE_EMAIL,
        sessionIdentifier: 'x',
      }).success,
    ).toBe(true);
  });

  it('RecipientAccessAuth に新タイプが含まれる', () => {
    expect(ZRecipientAccessAuthSchema.safeParse({ type: DocumentAuth.EMAIL_OTP, token: '123456' }).success).toBe(true);
  });
});
