import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';

import {
  computeDashboardStatus,
  computeDaysUntilExpiration,
  computeStaleBadgeKind,
  computeStaleDays,
  getCurrentSigners,
} from './dashboard-progress';

describe('dashboard progress(フェーズ2 ステップ29・30)', () => {
  it('4列分類: 未送信は awaiting-approval', () => {
    expect(computeDashboardStatus({ status: 'DRAFT', sentAt: null })).toBe('awaiting-approval');
  });

  it('4列分類: 送信済みは in-progress', () => {
    expect(computeDashboardStatus({ status: 'PENDING', sentAt: new Date() })).toBe('in-progress');
  });

  it('4列分類: 完了は completed', () => {
    expect(computeDashboardStatus({ status: 'PENDING', sentAt: new Date(), completedAt: new Date() })).toBe(
      'completed',
    );
  });

  it('4列分類: 期限切れ recipient ありは expired', () => {
    expect(
      computeDashboardStatus({
        status: 'PENDING',
        sentAt: new Date(),
        hasExpiredRecipient: true,
      }),
    ).toBe('expired');
  });

  it('現在の署名者(未署名 SIGNER)を抽出する', () => {
    const signers = getCurrentSigners([
      { role: 'SIGNER', signingStatus: 'NOT_SIGNED', email: 'a@example.com' },
      { role: 'SIGNER', signingStatus: 'SIGNED', email: 'b@example.com' },
      { role: 'CC', signingStatus: 'NOT_SIGNED', email: 'c@example.com' },
    ]);

    expect(signers).toHaveLength(1);
    expect(signers[0].email).toBe('a@example.com');
  });

  it('滞留日数を計算する', () => {
    const now = DateTime.fromISO('2026-10-15T00:00:00+09:00');

    expect(computeStaleDays({ sentAt: '2026-10-08T00:00:00+09:00', now })).toBe(7);
    expect(computeStaleDays({ sentAt: null, now })).toBeNull();
  });

  it('期限までの日数を計算する(期限切れは負値)', () => {
    const now = DateTime.fromISO('2026-10-15T00:00:00+09:00');

    expect(computeDaysUntilExpiration({ expiresAt: '2026-10-18T00:00:00+09:00', now })).toBe(3);
    expect(computeDaysUntilExpiration({ expiresAt: '2026-10-12T00:00:00+09:00', now })).toBe(-3);
    expect(computeDaysUntilExpiration({ expiresAt: null, now })).toBeNull();
  });

  it('滞留バッジ種別を計算する', () => {
    expect(computeStaleBadgeKind({ staleDays: null, daysUntilExpiration: null })).toBe('none');
    expect(computeStaleBadgeKind({ staleDays: 3, daysUntilExpiration: 10 })).toBe('normal');
    expect(computeStaleBadgeKind({ staleDays: 7, daysUntilExpiration: 10 })).toBe('warning');
    expect(computeStaleBadgeKind({ staleDays: 1, daysUntilExpiration: 2 })).toBe('warning');
    expect(computeStaleBadgeKind({ staleDays: 1, daysUntilExpiration: -1 })).toBe('danger');
  });
});
