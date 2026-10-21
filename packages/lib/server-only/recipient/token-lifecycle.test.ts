import { describe, expect, it } from 'vitest';

import { generateSecureRecipientToken } from './token-lifecycle';

describe('recipient token lifecycle(フェーズ2 ステップ16〜17)', () => {
  it('セキュアなトークンを生成する(十分なエントロピー)', () => {
    const token = generateSecureRecipientToken();

    // 32バイト = base64url で約43文字
    expect(token.length).toBeGreaterThanOrEqual(40);

    // URL 安全な文字のみ
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('トークンは一意である', () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateSecureRecipientToken()));

    expect(tokens.size).toBe(100);
  });
});
