import type { PlanId } from '@documenso/lib/constants/plans';
import { canSendDocument, isFeatureEnabledForPlan, PLANS } from '@documenso/lib/constants/plans';
import { assertCanSendDocumentForTeam, getTeamPlanInfo } from '@documenso/lib/server-only/team/get-team-plan';
import { generateDatabaseId } from '@documenso/lib/universal/id';
import { currentMonthlyPeriod } from '@documenso/lib/universal/monthly-period';
import { prisma } from '@documenso/prisma';
import { seedUser } from '@documenso/prisma/seed/users';
import { expect, test } from '@playwright/test';

/**
 * フェーズ3 ステップ32: プラン×機能の可用性マトリクス E2E
 *
 * ゲートの通過/遮断両面を検証する(ロジック層。UI 導線は CI で結合確認)。
 */
test.describe('[JP] Plan Gates', () => {
  const featureMatrix: {
    feature: Parameters<typeof isFeatureEnabledForPlan>[0]['feature'];
    FREE: boolean;
    STANDARD: boolean;
    BUSINESS: boolean;
  }[] = [
    { feature: 'firebaseEmailAuth', FREE: false, STANDARD: true, BUSINESS: true },
    { feature: 'timestamp', FREE: false, STANDARD: false, BUSINESS: false },
    { feature: 'approvalFlow', FREE: false, STANDARD: false, BUSINESS: true },
    { feature: 'templateSharing', FREE: false, STANDARD: true, BUSINESS: true },
    { feature: 'bulkSend', FREE: false, STANDARD: false, BUSINESS: true },
    { feature: 'complianceKit', FREE: false, STANDARD: true, BUSINESS: true },
    { feature: 'companySeal', FREE: false, STANDARD: true, BUSINESS: true },
    { feature: 'customEmailSettings', FREE: false, STANDARD: true, BUSINESS: true },
  ];

  for (const { feature, FREE, STANDARD, BUSINESS } of featureMatrix) {
    test(`feature gate: ${feature}`, () => {
      expect(isFeatureEnabledForPlan({ plan: 'FREE', feature })).toBe(FREE);
      expect(isFeatureEnabledForPlan({ plan: 'STANDARD', feature })).toBe(STANDARD);
      expect(isFeatureEnabledForPlan({ plan: 'BUSINESS', feature })).toBe(BUSINESS);
    });
  }

  test('monthly limit gate: FREE blocks at 3, STANDARD at 100, BUSINESS unlimited', () => {
    const plans: PlanId[] = ['FREE', 'STANDARD', 'BUSINESS'];

    for (const plan of plans) {
      const limit = PLANS[plan].monthlyDocumentLimit;

      for (let count = 0; count <= (limit ?? 5); count++) {
        const result = canSendDocument({ plan, currentMonthlyCount: count });

        if (limit === null) {
          expect(result.allowed).toBe(true);
        } else {
          expect(result.allowed).toBe(count < limit);
        }
      }
    }
  });

  test('upgrade path exists for blocked features', () => {
    // 無料で遮断されるプラン機能は、いずれかの上位プランで有効(アップグレード導線が成立する)
    // タイムスタンプは環境変数オプトイン機能のためプラン機能から除外
    const planGatedFeatures = featureMatrix.filter((f) => f.feature !== 'timestamp');
    for (const { feature, FREE } of planGatedFeatures) {
      if (!FREE) {
        const enabledInHigherPlan = ['STANDARD', 'BUSINESS'].some((plan) =>
          isFeatureEnabledForPlan({ plan: plan as PlanId, feature }),
        );

        expect(enabledInHigherPlan).toBe(true);
      }
    }
  });

  test('A4: server-side quota verification rejects document creation when 3-count reached on FREE plan', async () => {
    const { team } = await seedUser({ isPersonalOrganisation: true });

    // 初期状態（0件送信）では送信可能
    const initialInfo = await getTeamPlanInfo({ teamId: team.id });
    expect(initialInfo.planId).toBe('FREE');
    expect(initialInfo.monthlyLimit).toBe(3);
    expect(initialInfo.allowed).toBe(true);
    await expect(assertCanSendDocumentForTeam({ teamId: team.id })).resolves.not.toThrow();

    // 当月送信数を3件（上限到達）に設定
    const period = currentMonthlyPeriod();
    await prisma.organisationMonthlyStat.upsert({
      where: {
        organisationId_period: {
          organisationId: team.organisationId,
          period,
        },
      },
      create: {
        id: generateDatabaseId('org_monthly_stat'),
        organisationId: team.organisationId,
        period,
        documentCount: 3,
      },
      update: {
        documentCount: 3,
      },
    });

    // 上限到達後は送信ブロックされ、AppError(LIMIT_EXCEEDED) と日本語メッセージが返ること
    const reachedInfo = await getTeamPlanInfo({ teamId: team.id });
    expect(reachedInfo.allowed).toBe(false);
    expect(reachedInfo.remaining).toBe(0);

    await expect(assertCanSendDocumentForTeam({ teamId: team.id })).rejects.toThrow(
      '当月の送信上限（3通）に達しました。プランをアップグレードしてください。',
    );
  });
});
