/**
 * フェーズ3 ステップ26: 月額固定 3 プラン定義
 *
 * - 無料(FREE): 月3件 / メンバー1名
 * - スタンダード(STANDARD): 月100件(年払いは月120件) + Firebaseメール認証 + メンバー3名まで
 * - ビジネス(BUSINESS): 無制限 + 承認フロー + テンプレート共有 + CSV一括 + メンバー無制限
 *
 * 取引先の本人確認はメールOTP(LOW)と Firebase Authentication メール認証(MEDIUM)のみ
 * (SMS 認証は提供しない)。
 */

export type PlanId = 'FREE' | 'STANDARD' | 'BUSINESS';

export type PlanFeatures = {
  id: PlanId;
  /** ja 表示名 */
  label: string;
  /** 月額(円・税込)。FREE は 0 */
  monthlyPriceJpy: number;
  /** 年額(円・税込・一括)。実質2ヶ月分無料 */
  annualPriceJpy: number;
  /** 月次送信件数上限。null は無制限 */
  monthlyDocumentLimit: number | null;
  /** 年払い時の年間送信件数一括枠 */
  annualDocumentLimit: number | null;
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
    /** 電帳法コンプライアンス・キット（事務処理規程・チェックリスト・社内備付出力） */
    complianceKit: boolean;
    /** 会社角印・代表取締役丸印・カスタム透過印影（有料プラン限定） */
    companySeal: boolean;
    /** 自社ブランドメール設定（送信元・Reply-To・送信者名カスタマイズ、有料プラン限定） */
    customEmailSettings: boolean;
  };
  /** 組織メンバー上限（オーナー含む）。null は無制限 */
  maxMembers: number | null;
};

export const PLANS: Record<PlanId, PlanFeatures> = {
  FREE: {
    id: 'FREE',
    label: '無料',
    monthlyPriceJpy: 0,
    annualPriceJpy: 0,
    monthlyDocumentLimit: 3,
    annualDocumentLimit: 36,
    features: {
      firebaseEmailAuth: false,
      timestamp: false,
      approvalFlow: false,
      templateSharing: false,
      bulkSend: false,
      complianceKit: false,
      companySeal: false,
      customEmailSettings: false,
    },
    maxMembers: 1,
  },
  STANDARD: {
    id: 'STANDARD',
    label: '中小応援スタンダード',
    monthlyPriceJpy: 2980,
    annualPriceJpy: 29760, // 2,480円/月相当（実質2ヶ月無料）
    monthlyDocumentLimit: 100,
    annualDocumentLimit: 1440, // 年払い特典: 月120件 × 12ヶ月
    features: {
      firebaseEmailAuth: true,
      timestamp: false,
      approvalFlow: false,
      templateSharing: true,
      bulkSend: false,
      complianceKit: true,
      companySeal: true,
      customEmailSettings: true,
    },
    maxMembers: 3,
  },
  BUSINESS: {
    id: 'BUSINESS',
    label: 'ビジネス',
    monthlyPriceJpy: 6980,
    annualPriceJpy: 69800, // 月換算約5,817円（実質2ヶ月無料）
    monthlyDocumentLimit: null,
    annualDocumentLimit: null,
    features: {
      firebaseEmailAuth: true,
      timestamp: false,
      approvalFlow: true,
      templateSharing: true,
      bulkSend: true,
      complianceKit: true,
      companySeal: true,
      customEmailSettings: true,
    },
    maxMembers: null,
  },
};

/**
 * 送信枠の都度買い（チケット課金）パッケージ定義
 * 月額課金とは別に、スポットで送信数を追加購入可能。
 */
export type CreditPackageId = 'PACK_10' | 'PACK_50';

export type CreditPackage = {
  id: CreditPackageId;
  name: string;
  credits: number;
  priceJpy: number;
  pricePerDocumentJpy: number;
  stripePriceEnvKey: string;
};

export const SEND_CREDIT_PACKAGES: Record<CreditPackageId, CreditPackage> = {
  PACK_10: {
    id: 'PACK_10',
    name: '追加10件チケット',
    credits: 10,
    priceJpy: 1980,
    pricePerDocumentJpy: 198,
    stripePriceEnvKey: 'NEXT_PRIVATE_STRIPE_PRICE_ID_CREDIT_10',
  },
  PACK_50: {
    id: 'PACK_50',
    name: '追加50件チケット',
    credits: 50,
    priceJpy: 5800,
    pricePerDocumentJpy: 116,
    stripePriceEnvKey: 'NEXT_PRIVATE_STRIPE_PRICE_ID_CREDIT_50',
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
 * 送信可能か(月次上限および追加購入クレジットの合算チェック)。
 *
 * `isAnnual: true` の場合は年払い契約の月次枠（年間枠の1/12、切り上げ）を適用する。
 * 年払い特典として STANDARD は月100件 → 月120件に拡大される。
 */
export const canSendDocument = ({
  plan,
  currentMonthlyCount,
  extraCredits = 0,
  isAnnual = false,
}: {
  plan: PlanId;
  currentMonthlyCount: number;
  extraCredits?: number;
  isAnnual?: boolean;
}): {
  allowed: boolean;
  limit: number | null;
  remaining: number | null;
  extraCredits: number;
} => {
  const annualLimit = PLANS[plan].annualDocumentLimit;
  const baseLimit = isAnnual
    ? annualLimit === null
      ? null
      : Math.ceil(annualLimit / 12)
    : PLANS[plan].monthlyDocumentLimit;

  if (baseLimit === null) {
    return {
      allowed: true,
      limit: null,
      remaining: null,
      extraCredits,
    };
  }

  const effectiveLimit = baseLimit + extraCredits;
  const remaining = Math.max(effectiveLimit - currentMonthlyCount, 0);

  return {
    allowed: currentMonthlyCount < effectiveLimit,
    limit: effectiveLimit,
    remaining,
    extraCredits,
  };
};

/**
 * Stripe Price ID が年払い（年一括）契約のものかを判定する。
 * 環境変数に設定された年額 Price ID と一致、または ID 文字列に ANNUAL / _YEAR を含む場合に真。
 */
export const isAnnualStripePriceId = (priceId?: string | null): boolean => {
  if (typeof process === 'undefined' || !process.env || !priceId) {
    return false;
  }

  if (
    priceId === process.env.NEXT_PRIVATE_STRIPE_PRICE_ID_STANDARD_ANNUAL ||
    priceId === process.env.NEXT_PRIVATE_STRIPE_PRICE_ID_BUSINESS_ANNUAL
  ) {
    return true;
  }

  const upper = priceId.toUpperCase();

  return upper.includes('ANNUAL') || upper.includes('_YEAR');
};

/**
 * 組織メンバーを追加招待できるか（プランの席上限チェック）。
 * 現在のメンバー数と未承認の招待数の合計がプラン上限を超えないかを判定する。
 */
export const canInviteOrganisationMembers = ({
  plan,
  currentMemberCount,
  pendingInviteCount = 0,
  newInviteCount = 1,
}: {
  plan: PlanId;
  currentMemberCount: number;
  pendingInviteCount?: number;
  newInviteCount?: number;
}): {
  allowed: boolean;
  limit: number | null;
  maxNewInviteCount: number;
} => {
  const limit = PLANS[plan].maxMembers;

  if (limit === null) {
    return {
      allowed: true,
      limit: null,
      maxNewInviteCount: newInviteCount,
    };
  }

  const usedSeats = currentMemberCount + pendingInviteCount;
  const maxNewInviteCount = Math.max(limit - usedSeats, 0);

  return {
    allowed: usedSeats + newInviteCount <= limit,
    limit,
    maxNewInviteCount,
  };
};

/**
 * 月次カウンタの月キー(Asia/Tokyo 基準)を返す。
 * 例: '2026-10'
 */
/**
 * Stripe Price ID 環境変数のマッピング。
 * 本番・ステージング環境の Stripe ダッシュボードで設定した Price ID と紐付ける。
 */
export type BillingInterval = 'month' | 'year';

export const getStripePriceIdForPlan = (plan: PlanId, interval: BillingInterval = 'month'): string | undefined => {
  if (typeof process === 'undefined' || !process.env) {
    return undefined;
  }

  if (interval === 'year') {
    switch (plan) {
      case 'STANDARD':
        return process.env.NEXT_PRIVATE_STRIPE_PRICE_ID_STANDARD_ANNUAL;
      case 'BUSINESS':
        return process.env.NEXT_PRIVATE_STRIPE_PRICE_ID_BUSINESS_ANNUAL;
      default:
        return undefined;
    }
  }

  switch (plan) {
    case 'STANDARD':
      return process.env.NEXT_PRIVATE_STRIPE_PRICE_ID_STANDARD;
    case 'BUSINESS':
      return process.env.NEXT_PRIVATE_STRIPE_PRICE_ID_BUSINESS;
    default:
      return undefined;
  }
};

/**
 * 送信チケット（追加クレジット）の Stripe Price ID 環境変数を取得する。
 */
export const getStripePriceIdForCreditPackage = (packageId: CreditPackageId): string | undefined => {
  if (typeof process === 'undefined' || !process.env) {
    return undefined;
  }

  switch (packageId) {
    case 'PACK_10':
      return process.env.NEXT_PRIVATE_STRIPE_PRICE_ID_CREDIT_10;
    case 'PACK_50':
      return process.env.NEXT_PRIVATE_STRIPE_PRICE_ID_CREDIT_50;
    default:
      return undefined;
  }
};

/**
 * Stripe Price ID からプラン ID を逆引きする。
 */
export const getPlanIdFromStripePriceId = (priceId: string): PlanId => {
  if (typeof process !== 'undefined' && process.env) {
    if (
      priceId === process.env.NEXT_PRIVATE_STRIPE_PRICE_ID_STANDARD ||
      priceId === process.env.NEXT_PRIVATE_STRIPE_PRICE_ID_STANDARD_ANNUAL
    ) {
      return 'STANDARD';
    }
    if (
      priceId === process.env.NEXT_PRIVATE_STRIPE_PRICE_ID_BUSINESS ||
      priceId === process.env.NEXT_PRIVATE_STRIPE_PRICE_ID_BUSINESS_ANNUAL
    ) {
      return 'BUSINESS';
    }
  }

  // フォールバック（priceId 文字列自身にプラン名が含まれる場合）
  const upper = priceId.toUpperCase();
  if (upper.includes('BUSINESS')) {
    return 'BUSINESS';
  }
  if (upper.includes('STANDARD')) {
    return 'STANDARD';
  }

  return 'FREE';
};

/**
 * 組織情報（サブスクリプションおよびクレーム）からプラン ID を解決する共通関数。
 * クライアント・サーバー双方で同じロジックを用いてプランを判定する。
 */
export const resolvePlanIdFromOrganisation = (
  org?: {
    subscription?: { planId?: string | null } | null;
    organisationClaim?: { documentQuota?: number | null } | null | unknown;
  } | null,
): PlanId => {
  if (!org) {
    return 'FREE';
  }

  const planIdStr = org.subscription?.planId?.toUpperCase() || '';
  if (planIdStr.includes('BUSINESS')) {
    return 'BUSINESS';
  }
  if (planIdStr.includes('STANDARD')) {
    return 'STANDARD';
  }

  if (org.organisationClaim && typeof org.organisationClaim === 'object') {
    const claim = org.organisationClaim as { documentQuota?: number | null };
    if (claim.documentQuota === null) {
      return 'BUSINESS';
    }
    if (claim.documentQuota !== undefined && claim.documentQuota >= 100) {
      return 'STANDARD';
    }
  }

  return 'FREE';
};
