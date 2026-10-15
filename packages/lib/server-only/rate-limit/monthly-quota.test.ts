import { describe, expect, it } from 'vitest';
import { AppError, AppErrorCode } from '../../errors/app-error';
import { getAppErrorMessageJa } from '../../errors/app-error-ja';
import {
  getQuotaUsagePercent,
  getQuotaWarningCount,
  isQuotaExceeded,
  isQuotaNearing,
} from '../../universal/quota-usage';
import { getQuotaAlertKind } from './get-quota-alert-kind';

describe('Plan monthly quota & warning threshold logic', () => {
  describe('Quota math & thresholds', () => {
    it('calculates 80% warning count with ceiling', () => {
      expect(getQuotaWarningCount(100)).toBe(80);
      expect(getQuotaWarningCount(10)).toBe(8);
      expect(getQuotaWarningCount(5)).toBe(4);
      expect(getQuotaWarningCount(3)).toBe(3);
    });

    it('determines isQuotaNearing and isQuotaExceeded correctly', () => {
      const quota = 10;
      // Below 80%: not nearing, not exceeded
      expect(isQuotaNearing(quota, 7)).toBe(false);
      expect(isQuotaExceeded(quota, 7)).toBe(false);

      // At or above 80% (8, 9): nearing, not exceeded
      expect(isQuotaNearing(quota, 8)).toBe(true);
      expect(isQuotaNearing(quota, 9)).toBe(true);
      expect(isQuotaExceeded(quota, 9)).toBe(false);

      // At or above quota (10+): exceeded, not nearing
      expect(isQuotaExceeded(quota, 10)).toBe(true);
      expect(isQuotaNearing(quota, 10)).toBe(false);
      expect(isQuotaExceeded(quota, 15)).toBe(true);
    });

    it('handles unlimited and blocked quotas', () => {
      // null = unlimited
      expect(isQuotaExceeded(null, 9999)).toBe(false);
      expect(isQuotaNearing(null, 9999)).toBe(false);

      // 0 = blocked
      expect(isQuotaExceeded(0, 0)).toBe(true);
      expect(isQuotaNearing(0, 0)).toBe(false);
    });

    it('calculates percentage clamped to 100', () => {
      expect(getQuotaUsagePercent(50, 100)).toBe(50);
      expect(getQuotaUsagePercent(80, 100)).toBe(80);
      expect(getQuotaUsagePercent(120, 100)).toBe(100);
      expect(getQuotaUsagePercent(10, null)).toBe(0);
    });
  });

  describe('Quota alert kind trigger', () => {
    it('returns quotaNearing only on the single crossing request', () => {
      const quota = 10;
      // 7 -> 8: crosses 80% threshold
      expect(getQuotaAlertKind({ previousCount: 7, newCount: 8, quota })).toBe('quotaNearing');

      // 8 -> 9: already above threshold, does not alert again
      expect(getQuotaAlertKind({ previousCount: 8, newCount: 9, quota })).toBe(null);
    });

    it('returns quota on the request crossing or reaching 100%', () => {
      const quota = 10;
      // 9 -> 10: reaches quota
      expect(getQuotaAlertKind({ previousCount: 9, newCount: 10, quota })).toBe('quota');

      // Jump from 7 -> 11: quota supersedes warning
      expect(getQuotaAlertKind({ previousCount: 7, newCount: 11, quota })).toBe('quota');

      // 10 -> 11: already reached, does not re-alert
      expect(getQuotaAlertKind({ previousCount: 10, newCount: 11, quota })).toBe(null);
    });
  });

  describe('Japanese localized error messages for limits', () => {
    it('returns correct localized messages for plan limits and quota errors', () => {
      expect(getAppErrorMessageJa(AppErrorCode.LIMIT_EXCEEDED)).toContain('上限数に達しました');
      expect(getAppErrorMessageJa('PLAN_MONTHLY_LIMIT_EXCEEDED')).toContain('当月の送信可能件数に達しました');
      expect(getAppErrorMessageJa('RECIPIENT_LIMIT_EXCEEDED')).toContain('受信者数の上限を超えています');
    });

    it('instantiates AppError with LIMIT_EXCEEDED without schema error', () => {
      const error = new AppError(AppErrorCode.LIMIT_EXCEEDED, {
        message: 'Monthly quota exceeded',
      });
      expect(error.code).toBe(AppErrorCode.LIMIT_EXCEEDED);
      expect(error.statusCode).toBe(400);
    });
  });
});
