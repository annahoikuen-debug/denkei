import { describe, expect, it } from 'vitest';
import { SELF_HELP_GUIDE_ITEMS } from './self-help-guide';

describe('トラブルシューティング自己解決ガイド (self-help-guide)', () => {
  it('主要な4大カテゴリ（メール不達、モバイル操作、OTP、費用負担）のガイドが存在する', () => {
    const categories = SELF_HELP_GUIDE_ITEMS.map((item) => item.category);

    expect(categories).toContain('EMAIL_DELIVERY');
    expect(categories).toContain('MOBILE_DEVICE');
    expect(categories).toContain('OTP_AUTH');
    expect(categories).toContain('LEGAL_SECURITY');
  });

  it('各ガイド項目にタイトル、要約、具体的ステップ（配列）が定義されている', () => {
    for (const item of SELF_HELP_GUIDE_ITEMS) {
      expect(item.id).toBeDefined();
      expect(item.title.length).toBeGreaterThan(5);
      expect(item.summary.length).toBeGreaterThan(10);
      expect(item.steps.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('メール不達ガイドにキャリアメールや迷惑メールフォルダに関する記載がある', () => {
    const emailItem = SELF_HELP_GUIDE_ITEMS.find((item) => item.id === 'email-not-received');
    expect(emailItem).toBeDefined();
    expect(emailItem?.steps.join(' ')).toContain('迷惑メール');
    expect(emailItem?.steps.join(' ')).toContain('キャリアメール');
  });
});
