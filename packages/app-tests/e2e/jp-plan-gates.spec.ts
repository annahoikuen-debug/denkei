import {
    canSendDocument,
    isFeatureEnabledForPlan,
    PLANS,
} from '@documenso/lib/constants/plans';
import { expect, test } from '@playwright/test';

import type { PlanId } from '@documenso/lib/constants/plans';

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
            { feature: 'timestamp', FREE: false, STANDARD: true, BUSINESS: true },
            { feature: 'approvalFlow', FREE: false, STANDARD: false, BUSINESS: true },
            { feature: 'templateSharing', FREE: false, STANDARD: false, BUSINESS: true },
            { feature: 'bulkSend', FREE: false, STANDARD: false, BUSINESS: true },
        ];

    for (const { feature, FREE, STANDARD, BUSINESS } of featureMatrix) {
        test(`feature gate: ${feature}`, () => {
            expect(isFeatureEnabledForPlan({ plan: 'FREE', feature })).toBe(FREE);
            expect(isFeatureEnabledForPlan({ plan: 'STANDARD', feature })).toBe(STANDARD);
            expect(isFeatureEnabledForPlan({ plan: 'BUSINESS', feature })).toBe(BUSINESS);
        });
    }

    test('monthly limit gate: FREE blocks at 3, others unlimited', () => {
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
        // 無料で遮断される機能は、いずれかの上位プランで有効(アップグレード導線が成立する)
        for (const { feature, FREE } of featureMatrix) {
            if (!FREE) {
                const enabledInHigherPlan = ['STANDARD', 'BUSINESS'].some((plan) =>
                    isFeatureEnabledForPlan({ plan: plan as PlanId, feature }),
                );

                expect(enabledInHigherPlan).toBe(true);
            }
        }
    });
});
