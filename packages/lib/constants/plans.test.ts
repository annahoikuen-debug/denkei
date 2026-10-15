import { describe, expect, it } from 'vitest';

import {
    canSendDocument,
    getMonthlyCounterKey,
    isFeatureEnabledForPlan,
    PLANS,
} from './plans';

describe('プラン定義(フェーズ3 ステップ26)', () => {
    it('3プランが定義されている', () => {
        expect(Object.keys(PLANS)).toEqual(['FREE', 'STANDARD', 'BUSINESS']);
    });

    it('無料プランは月3件・スタンダード以上は無制限', () => {
        expect(PLANS.FREE.monthlyDocumentLimit).toBe(3);
        expect(PLANS.STANDARD.monthlyDocumentLimit).toBeNull();
        expect(PLANS.BUSINESS.monthlyDocumentLimit).toBeNull();
    });

    it('機能マトリクス: 承認フロー・CSV一括は BUSINESS のみ', () => {
        expect(PLANS.FREE.features.approvalFlow).toBe(false);
        expect(PLANS.STANDARD.features.approvalFlow).toBe(false);
        expect(PLANS.BUSINESS.features.approvalFlow).toBe(true);

        expect(PLANS.FREE.features.bulkSend).toBe(false);
        expect(PLANS.BUSINESS.features.bulkSend).toBe(true);
    });

    it('Firebase メール認証・タイムスタンプは STANDARD 以上', () => {
        expect(PLANS.FREE.features.firebaseEmailAuth).toBe(false);
        expect(PLANS.STANDARD.features.firebaseEmailAuth).toBe(true);
        expect(PLANS.STANDARD.features.timestamp).toBe(true);
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

    it('無制限プラン: どの件数でも送信可', () => {
        expect(canSendDocument({ plan: 'STANDARD', currentMonthlyCount: 99999 }).allowed).toBe(true);
    });

    it('残数を計算する', () => {
        expect(canSendDocument({ plan: 'FREE', currentMonthlyCount: 1 }).remaining).toBe(2);
        expect(canSendDocument({ plan: 'STANDARD', currentMonthlyCount: 5 }).remaining).toBeNull();
    });
});

describe('月次カウンタ(ステップ26)', () => {
    it('Asia/Tokyo 基準で月キーを返す', () => {
        // 2026-10-14T18:00:00Z = JST 2026-10-15 03:00 → '2026-10'
        expect(getMonthlyCounterKey(new Date('2026-10-14T18:00:00Z'))).toBe('2026-10');

        // 2026-09-30T15:00:00Z = JST 2026-10-01 00:00 → '2026-10'(月跨ぎ)
        expect(getMonthlyCounterKey(new Date('2026-09-30T15:00:00Z'))).toBe('2026-10');
    });
});
