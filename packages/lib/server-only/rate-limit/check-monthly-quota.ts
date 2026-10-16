import { prisma } from '@documenso/prisma';
import { AppError, AppErrorCode } from '../../errors/app-error';
import { jobsClient } from '../../jobs/client';
import { generateDatabaseId } from '../../universal/id';
import { currentMonthlyPeriod } from '../../universal/monthly-period';
import { getQuotaAlertKind } from './get-quota-alert-kind';
import type { LimitCounter } from './types';

type CheckMonthlyQuotaOptions = {
  organisationId: string;
  counter: LimitCounter;
  quota: number | null;
  count: number;
};

const COUNTER_COLUMN = {
  document: 'documentCount',
  email: 'emailCount',
  api: 'apiCount',
} as const satisfies Record<LimitCounter, string>;

export const checkMonthlyQuota = async (opts: CheckMonthlyQuotaOptions): Promise<void> => {
  if (opts.quota === 0) {
    throw new AppError(AppErrorCode.LIMIT_EXCEEDED, {
      message:
        'Your request could not be completed at this time due to your account exceeding the fair use limits of your current plan. Please contact support.',
      userMessage: '当月の送信可能件数に達しました。プラン変更で上限を引き上げることができます。',
    });
  }

  const period = currentMonthlyPeriod();
  const column = COUNTER_COLUMN[opts.counter];

  const latestMonthlyStat = await prisma.organisationMonthlyStat.upsert({
    where: {
      organisationId_period: {
        organisationId: opts.organisationId,
        period,
      },
    },
    update: {
      [column]: { increment: opts.count },
    },
    create: {
      id: generateDatabaseId('org_monthly_stat'),
      organisationId: opts.organisationId,
      period,
      [column]: opts.count,
    },
  });

  // For unlimited quotas, we still allow the request to send so we can collect the monthly stat.
  if (opts.quota === null) {
    return;
  }

  const newCount = latestMonthlyStat[column];
  const previousCount = newCount - opts.count;

  // Returns 'quota' on the single request that reached (or jumped past) the quota,
  // 'quotaNearing' on the single request that reached the warning threshold,
  // otherwise null. See getQuotaAlertKind for the exactly-once guarantee.
  const alertKind = getQuotaAlertKind({
    previousCount,
    newCount,
    quota: opts.quota,
  });

  // Trigger the alert before the over-quota check — the 'quota' alert usually fires
  // on the successful request that consumes the last unit of allowance, but when a
  // batch jumps past the boundary it fires on this rejected request. Either way it
  // will never fire again this period, so it must be enqueued before any throw.
  if (alertKind) {
    await jobsClient
      .triggerJob({
        name: 'send.organisation-limit-alert.email',
        payload: {
          organisationId: opts.organisationId,
          counter: opts.counter,
          kind: alertKind,
          period,
        },
      })
      .catch((error) => {
        console.error({
          msg: 'Failed to send organisation limit alert email',
          error,
        });

        // Do nothing.
      });
  }

  if (newCount > opts.quota) {
    throw new AppError(AppErrorCode.LIMIT_EXCEEDED, {
      message:
        'Your request could not be completed at this time due to your account exceeding the fair use limits of your current plan. Please contact support.',
      userMessage: '当月の送信可能件数に達しました。プラン変更で上限を引き上げることができます。',
    });
  }
};
