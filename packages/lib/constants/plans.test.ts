import { describe, expect, it } from 'vitest';

import { canSendDocument, getPlanIdFromStripePriceId, isFeatureEnabledForPlan, PLANS } from './plans';

describe('プラン定義(フェーズ3 ステップ26)', () => {
  it('3プランが定義されている', () => {
    expect(Object.keys(PLANS)).toEqual(['FREE', 'STANDARD', 'BUSINESS']);
  });

  it('無料プランは月3件・スタンダードは100件・ビジネスは無制限', () => {
    expect(PLANS.FREE.monthlyDocumentLimit).toBe(3);
    expect(PLANS.STANDARD.monthlyDocumentLimit).toBe(100);
    expect(PLANS.BUSINESS.monthlyDocumentLimit).toBeNull();
  });

  it('機能マトリクス: 承認フロー・CSV一括は BUSINESS のみ', () => {
    expect(PLANS.FREE.features.approvalFlow).toBe(false);
    expect(PLANS.STANDARD.features.approvalFlow).toBe(false);
    expect(PLANS.BUSINESS.features.approvalFlow).toBe(true);

    expect(PLANS.FREE.features.bulkSend).toBe(false);
    expect(PLANS.BUSINESS.features.bulkSend).toBe(true);
  });

  it('Firebase メール認証は STANDARD 以上、タイムスタンプは基本無効', () => {
    expect(PLANS.FREE.features.firebaseEmailAuth).toBe(false);
    expect(PLANS.STANDARD.features.firebaseEmailAuth).toBe(true);
    expect(PLANS.STANDARD.features.timestamp).toBe(false);
    expect(PLANS.STANDARD.features.templateSharing).toBe(true);
  });

  it('isFeatureEnabledForPlan でゲート判定できる', () => {
    expect(isFeatureEnabledForPlan({ plan: 'FREE', feature: 'bulkSend' })).toBe(false);
    expect(isFeatureEnabledForPlan({ plan: 'BUSINESS', feature: 'bulkSend' })).toBe(true);
  });
});

describe('プラン制限ゲート(ステップ27)', () => {
  it('無料プラン: 3件目までは送信可、4件目はブロック', () => {
    expect(canSendDocument({ plan: 'FREE', currentMonthlyCount: 0 }).allowed).toBe(true);
    expect(canSendDocument({ plan: 'FREE', currentMonthlyCount: 2 }).allowed).toBe(true);
    expect(canSendDocument({ plan: 'FREE', currentMonthlyCount: 3 }).allowed).toBe(false);
  });

  it('上限付きプラン: スタンダードは100件、ビジネスは無制限', () => {
    expect(canSendDocument({ plan: 'STANDARD', currentMonthlyCount: 99 }).allowed).toBe(true);
    expect(canSendDocument({ plan: 'STANDARD', currentMonthlyCount: 100 }).allowed).toBe(false);
    expect(canSendDocument({ plan: 'BUSINESS', currentMonthlyCount: 99999 }).allowed).toBe(true);
  });

  it('残数を計算する', () => {
    expect(canSendDocument({ plan: 'FREE', currentMonthlyCount: 1 }).remaining).toBe(2);
    expect(canSendDocument({ plan: 'STANDARD', currentMonthlyCount: 95 }).remaining).toBe(5);
    expect(canSendDocument({ plan: 'BUSINESS', currentMonthlyCount: 500 }).remaining).toBeNull();
  });
});

describe('Stripe Price ID マッピング', () => {
  it('環境変数およびフォールバックからプランIDを正しく判定できる', () => {
    expect(getPlanIdFromStripePriceId('price_standard_test123')).toBe('STANDARD');
    expect(getPlanIdFromStripePriceId('price_business_test456')).toBe('BUSINESS');
    expect(getPlanIdFromStripePriceId('price_unknown_000')).toBe('FREE');
  });
});
