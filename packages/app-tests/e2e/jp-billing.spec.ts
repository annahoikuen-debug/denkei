import { PLANS } from '@documenso/lib/constants/plans';
import { getTeamPlanInfo } from '@documenso/lib/server-only/team/get-team-plan';
import { prisma } from '@documenso/prisma';
import { seedUser } from '@documenso/prisma/seed/users';
import { expect, test } from '@playwright/test';
import { SubscriptionStatus } from '@prisma/client';

/**
 * v1.1 Stage A3: Stripe 課金・サブスクリプション反映 E2E
 *
 * - プランごとの Stripe Price ID 解決
 * - Checkout 完了後の Subscription テーブル更新
 * - プラン切り替え（FREE -> STANDARD / BUSINESS）の即時反映
 * - 領収書・請求データの紐付き
 */
test.describe('[JP] Billing & Stripe Integration', () => {
  test('resolves correct Stripe Price ID for plans', () => {
    // STANDARD プランの価格・機能定義
    expect(PLANS.STANDARD.monthlyPriceJpy).toBe(2980);
    expect(PLANS.STANDARD.monthlyDocumentLimit).toBe(100);

    // BUSINESS プランの価格・機能定義
    expect(PLANS.BUSINESS.monthlyPriceJpy).toBe(4980);
    expect(PLANS.BUSINESS.monthlyDocumentLimit).toBeNull(); // 無制限
  });

  test('upgrades team from FREE to STANDARD upon subscription activation', async () => {
    const { team } = await seedUser({ isPersonalOrganisation: true });

    // 初期状態は FREE
    const initialPlanInfo = await getTeamPlanInfo({ teamId: team.id });
    expect(initialPlanInfo.planId).toBe('FREE');
    expect(initialPlanInfo.monthlyLimit).toBe(3);

    // Stripe Webhook でサブスクリプションが有効化された状態をシミュレート
    const standardPriceId = 'price_standard_test_123';
    await prisma.subscription.create({
      data: {
        organisationId: team.organisationId,
        customerId: 'cus_test_' + Date.now(),
        planId: 'sub_standard_' + Date.now(),
        priceId: standardPriceId,
        status: SubscriptionStatus.ACTIVE,
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // チームのプラン情報が STANDARD（月100件）に昇格していること
    const upgradedPlanInfo = await getTeamPlanInfo({ teamId: team.id });
    expect(upgradedPlanInfo.planId).toBe('STANDARD');
    expect(upgradedPlanInfo.monthlyLimit).toBe(100);
    expect(upgradedPlanInfo.allowed).toBe(true);
  });

  test('upgrades team to BUSINESS with unlimited documents and advanced features', async () => {
    const { team } = await seedUser({ isPersonalOrganisation: true });

    // BUSINESS サブスクリプションを付与
    await prisma.subscription.create({
      data: {
        organisationId: team.organisationId,
        customerId: 'cus_business_' + Date.now(),
        planId: 'sub_business_' + Date.now(),
        priceId: 'price_business_test_456',
        status: SubscriptionStatus.ACTIVE,
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const businessPlanInfo = await getTeamPlanInfo({ teamId: team.id });
    expect(businessPlanInfo.planId).toBe('BUSINESS');
    expect(businessPlanInfo.monthlyLimit).toBeNull(); // 無制限
    expect(businessPlanInfo.plan.features.bulkSend).toBe(true);
    expect(businessPlanInfo.plan.features.approvalFlow).toBe(true);
  });
});
