/**
 * フェーズ3 ステップ26: 月額固定 3 プラン定義
 *
 * - 無料(FREE): 月3件
 * - スタンダード(STANDARD): 無制限 + Firebaseメール認証 + タイムスタンプ
 * - ビジネス(BUSINESS): 承認フロー + テンプレート共有 + CSV一括
 *
 * 取引先の本人確認はメールOTP(LOW)と Firebase Authentication メール認証(MEDIUM)のみ
 * (SMS 認証は提供しない)。
 */

export type PlanId = 'FREE' | 'STANDARD' | 'BUSINESS';

export type PlanFeatures = {
    id: PlanId;
    /** ja 表示名 */
    label: string;
    /** 月額(円・税抜)。FREE は 0 */
    monthlyPriceJpy: number;
    /** 月次送信件数上限。null は無制限 */
    monthlyDocumentLimit: number | null;
    features: {
        /** Firebase メール認証(MEDIUM 本人確認) */
        firebaseEmailAuth: boolean;
        /** タイムスタンプ(RFC3161) */
        timestamp: boolean;
        /** 承認フロー(送信前承認ステップ) */
        approvalFlow: boolean;
        /** テンプレート共有 */
        templateSharing: boolean;
        /** CSV 一括送信 */
        bulkSend: boolean;
    };
};

export const PLANS: Record<PlanId, PlanFeatures> = {
    FREE: {
        id: 'FREE',
        label: '無料',
        monthlyPriceJpy: 0,
        monthlyDocumentLimit: 3,
        features: {
            firebaseEmailAuth: false,
            timestamp: false,
            approvalFlow: false,
            templateSharing: false,
            bulkSend: false,
        },
    },
    STANDARD: {
        id: 'STANDARD',
        label: 'スタンダード',
        monthlyPriceJpy: 1500,
        monthlyDocumentLimit: null,
        features: {
            firebaseEmailAuth: true,
            timestamp: true,
            approvalFlow: false,
            templateSharing: false,
            bulkSend: false,
        },
    },
    BUSINESS: {
        id: 'BUSINESS',
        label: 'ビジネス',
        monthlyPriceJpy: 5000,
        monthlyDocumentLimit: null,
        features: {
            firebaseEmailAuth: true,
            timestamp: true,
            approvalFlow: true,
            templateSharing: true,
            bulkSend: true,
        },
    },
};

/**
 * 機能がプランで利用可能かを判定する。
 */
export const isFeatureEnabledForPlan = ({
    plan,
    feature,
}: {
    plan: PlanId;
    feature: keyof PlanFeatures['features'];
}): boolean => {
    return PLANS[plan].features[feature];
};

/**
 * 送信可能か(月次上限チェック)。
 */
export const canSendDocument = ({
    plan,
    currentMonthlyCount,
}: {
    plan: PlanId;
    currentMonthlyCount: number;
}): { allowed: boolean; limit: number | null; remaining: number | null } => {
    const limit = PLANS[plan].monthlyDocumentLimit;

    if (limit === null) {
        return { allowed: true, limit: null, remaining: null };
    }

    const remaining = Math.max(limit - currentMonthlyCount, 0);

    return {
        allowed: currentMonthlyCount < limit,
        limit,
        remaining,
    };
};

/**
 * 月次カウンタの月キー(Asia/Tokyo 基準)を返す。
 * 例: '2026-10'
 */
export const getMonthlyCounterKey = (date: Date = new Date()): string => {
    // タイムゾーン: Asia/Tokyo(JST)基準で月を区切る
    const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);

    const year = jst.getUTCFullYear();
    const month = String(jst.getUTCMonth() + 1).padStart(2, '0');

    return `${year}-${month}`;
};
