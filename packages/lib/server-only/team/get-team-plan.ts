import { prisma } from '@documenso/prisma';
import { canSendDocument, isFeatureEnabledForPlan, PLANS, type PlanFeatures, type PlanId } from '../../constants/plans';
import { AppError, AppErrorCode } from '../../errors/app-error';
import { currentMonthlyPeriod } from '../../universal/monthly-period';

export type TeamPlanInfo = {
  planId: PlanId;
  plan: PlanFeatures;
  currentMonthlyCount: number;
  monthlyLimit: number | null;
  remaining: number | null;
  allowed: boolean;
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
  let planId: PlanId = 'FREE';

  // 1. Subscription から判定
  const planIdStr = organisation.subscription?.planId?.toUpperCase() || '';
  if (planIdStr.includes('BUSINESS')) {
    planId = 'BUSINESS';
  } else if (planIdStr.includes('STANDARD')) {
    planId = 'STANDARD';
  } else if (
    organisation.organisationClaim?.documentQuota !== null &&
    organisation.organisationClaim?.documentQuota !== undefined
  ) {
    if (organisation.organisationClaim.documentQuota >= 100) {
      planId = 'STANDARD';
    } else if (organisation.organisationClaim.documentQuota === null) {
      planId = 'BUSINESS';
    }
  }

  // 2. 当月送信数を OrganisationMonthlyStat から取得
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
  const sendCheck = canSendDocument({ plan: planId, currentMonthlyCount });

  return {
    planId,
    plan: PLANS[planId],
    currentMonthlyCount,
    monthlyLimit: sendCheck.limit,
    remaining: sendCheck.remaining,
    allowed: sendCheck.allowed,
  };
};

/**
 * 送信時にプランの月次上限を超過していないか検証し、超過時は AppError(ja) を投げる。
 */
export const assertCanSendDocumentForTeam = async ({ teamId }: { teamId: number }): Promise<void> => {
  const info = await getTeamPlanInfo({ teamId });

  if (!info.allowed) {
    throw new AppError(AppErrorCode.LIMIT_EXCEEDED, {
      message: `Monthly document limit exceeded for ${info.planId} plan (${info.currentMonthlyCount}/${info.monthlyLimit}).`,
      userMessage: `当月の送信上限（${info.monthlyLimit}通）に達しました。プランをアップグレードしてください。`,
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
    throw new AppError(AppErrorCode.FORBIDDEN, {
      message: `Feature '${feature}' is not available on the ${info.planId} plan.`,
      userMessage: `${featureLabelJa}は現在のプラン（${info.plan.label}）ではご利用いただけません。プランのアップグレードをご検討ください。`,
    });
  }
};
