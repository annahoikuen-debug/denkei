import { describe, expect, it } from 'vitest';

import {
  canSendDocument,
  getPlanIdFromStripePriceId,
  isFeatureEnabledForPlan,
  PLANS,
  resolvePlanIdFromOrganisation,
} from './plans';

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

  it('会社角印・自社メール設定・電帳法キットは STANDARD 以上限定', () => {
    expect(PLANS.FREE.features.companySeal).toBe(false);
    expect(PLANS.FREE.features.customEmailSettings).toBe(false);
    expect(PLANS.FREE.features.complianceKit).toBe(false);

    expect(PLANS.STANDARD.features.companySeal).toBe(true);
    expect(PLANS.STANDARD.features.customEmailSettings).toBe(true);
    expect(PLANS.STANDARD.features.complianceKit).toBe(true);

    expect(PLANS.BUSINESS.features.companySeal).toBe(true);
    expect(PLANS.BUSINESS.features.customEmailSettings).toBe(true);
  });

  it('isFeatureEnabledForPlan でゲート判定できる', () => {
    expect(isFeatureEnabledForPlan({ plan: 'FREE', feature: 'bulkSend' })).toBe(false);
    expect(isFeatureEnabledForPlan({ plan: 'BUSINESS', feature: 'bulkSend' })).toBe(true);
    expect(isFeatureEnabledForPlan({ plan: 'FREE', feature: 'complianceKit' })).toBe(false);
    expect(isFeatureEnabledForPlan({ plan: 'STANDARD', feature: 'complianceKit' })).toBe(true);
    expect(isFeatureEnabledForPlan({ plan: 'FREE', feature: 'companySeal' })).toBe(false);
    expect(isFeatureEnabledForPlan({ plan: 'STANDARD', feature: 'companySeal' })).toBe(true);
    expect(isFeatureEnabledForPlan({ plan: 'FREE', feature: 'customEmailSettings' })).toBe(false);
    expect(isFeatureEnabledForPlan({ plan: 'STANDARD', feature: 'customEmailSettings' })).toBe(true);
  });
});

describe('プラン制限ゲート ＆ チケット都度購入クレジット (ステップ27 / 提案4)', () => {
  it('無料プラン: 3件目までは送信可、4件目はブロック', () => {
    expect(canSendDocument({ plan: 'FREE', currentMonthlyCount: 0 }).allowed).toBe(true);
    expect(canSendDocument({ plan: 'FREE', currentMonthlyCount: 2 }).allowed).toBe(true);
    expect(canSendDocument({ plan: 'FREE', currentMonthlyCount: 3 }).allowed).toBe(false);
  });

  it('都度買いチケット(extraCredits)により無料プランでも上限を超えて送信できる', () => {
    // 無料プラン(3件上限)に10件チケットを追加 -> 上限13件
    const result = canSendDocument({ plan: 'FREE', currentMonthlyCount: 3, extraCredits: 10 });
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(13);
    expect(result.remaining).toBe(10);
    expect(result.extraCredits).toBe(10);

    // 13件送信済みならブロック
    const blocked = canSendDocument({ plan: 'FREE', currentMonthlyCount: 13, extraCredits: 10 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
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

describe('resolvePlanIdFromOrganisation', () => {
  it('組織が未設定または空の場合は FREE を返す', () => {
    expect(resolvePlanIdFromOrganisation(null)).toBe('FREE');
    expect(resolvePlanIdFromOrganisation(undefined)).toBe('FREE');
    expect(resolvePlanIdFromOrganisation({})).toBe('FREE');
  });

  it('サブスクリプションの planId から STANDARD / BUSINESS を解決できる', () => {
    expect(resolvePlanIdFromOrganisation({ subscription: { planId: 'price_standard_month' } })).toBe('STANDARD');
    expect(resolvePlanIdFromOrganisation({ subscription: { planId: 'price_business_year' } })).toBe('BUSINESS');
  });

  it('クレームの documentQuota からプランを解決できる', () => {
    expect(resolvePlanIdFromOrganisation({ organisationClaim: { documentQuota: 100 } })).toBe('STANDARD');
    expect(resolvePlanIdFromOrganisation({ organisationClaim: { documentQuota: null } })).toBe('BUSINESS');
    expect(resolvePlanIdFromOrganisation({ organisationClaim: { documentQuota: 3 } })).toBe('FREE');
  });
});
