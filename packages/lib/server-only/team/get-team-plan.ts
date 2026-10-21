import { prisma } from '@documenso/prisma';
import {
  canSendDocument,
  isAnnualStripePriceId,
  isFeatureEnabledForPlan,
  PLANS,
  type PlanFeatures,
  type PlanId,
  resolvePlanIdFromOrganisation,
} from '../../constants/plans';
import { AppError, AppErrorCode } from '../../errors/app-error';
import { currentMonthlyPeriod } from '../../universal/monthly-period';

export type TeamPlanInfo = {
  planId: PlanId;
  plan: PlanFeatures;
  currentMonthlyCount: number;
  monthlyLimit: number | null;
  remaining: number | null;
  allowed: boolean;
  extraCredits: number;
  isAnnual: boolean;
};

/**
 * チーム（組織）に紐付く現在のプラン種別、当月送信数、上限状況を取得する。
 */
export const getTeamPlanInfo = async ({ teamId }: { teamId: number }): Promise<TeamPlanInfo> => {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      organisation: {
        include: {
          subscription: true,
          organisationClaim: true,
        },
      },
    },
  });

  if (!team) {
    throw new AppError(AppErrorCode.NOT_FOUND, {
      message: 'Team not found',
      userMessage: 'チームが見つかりません',
    });
  }

  const { organisation } = team;
  // 1. Subscription / Claim から判定
  const planId: PlanId = resolvePlanIdFromOrganisation(organisation);
  const isAnnual = isAnnualStripePriceId(organisation.subscription?.priceId);

  // 2. 追加チケットクレジット（Claim flags または Claim から取得）
  const flags = (organisation.organisationClaim?.flags as Record<string, unknown> | null) || {};
  const extraCredits = typeof flags.extraSendCredits === 'number' ? flags.extraSendCredits : 0;

  // 3. 当月送信数を OrganisationMonthlyStat から取得
  const period = currentMonthlyPeriod();
  const stat = await prisma.organisationMonthlyStat.findUnique({
    where: {
      organisationId_period: {
        organisationId: organisation.id,
        period,
      },
    },
    select: { documentCount: true },
  });

  const currentMonthlyCount = stat?.documentCount ?? 0;
  const sendCheck = canSendDocument({ plan: planId, currentMonthlyCount, extraCredits, isAnnual });

  return {
    planId,
    plan: PLANS[planId],
    currentMonthlyCount,
    monthlyLimit: sendCheck.limit,
    remaining: sendCheck.remaining,
    allowed: sendCheck.allowed,
    extraCredits,
    isAnnual,
  };
};

/**
 * 送信時にプランの月次上限を超過していないか検証し、超過時は AppError(ja) を投げる。
 */
export const assertCanSendDocumentForTeam = async ({ teamId }: { teamId: number }): Promise<void> => {
  const info = await getTeamPlanInfo({ teamId });

  if (!info.allowed) {
    const userMessage = `当月の送信上限（${info.monthlyLimit}通）に達しました。プランをアップグレードしてください。`;
    throw new AppError(AppErrorCode.LIMIT_EXCEEDED, {
      message: userMessage,
      userMessage,
    });
  }
};

/**
 * チームのプランで指定機能が有効化されているか検証し、無効なら AppError を投げる。
 */
export const assertFeatureEnabledForTeam = async ({
  teamId,
  feature,
  featureLabelJa,
}: {
  teamId: number;
  feature: keyof PlanFeatures['features'];
  featureLabelJa: string;
}): Promise<void> => {
  const info = await getTeamPlanInfo({ teamId });

  if (!isFeatureEnabledForPlan({ plan: info.planId, feature })) {
    const userMessage = `${featureLabelJa}は現在のプラン（${info.plan.label}）ではご利用いただけません。プランのアップグレードをご検討ください。`;
    throw new AppError(AppErrorCode.FORBIDDEN, {
      message: userMessage,
      userMessage,
    });
  }
};
