import { describe, expect, it } from 'vitest';

import {
  getRetentionCutoff,
  isEnvelopeExpired,
  MAX_ENVELOPE_RETENTION_DAYS,
  parseEnvelopeRetentionDays,
} from './envelope-retention';

describe('parseEnvelopeRetentionDays', () => {
  it('未設定の場合は 0 (無効) を返す', () => {
    expect(parseEnvelopeRetentionDays(undefined)).toBe(0);
  });

  it('null の場合は 0 (無効) を返す', () => {
    expect(parseEnvelopeRetentionDays(null)).toBe(0);
  });

  it('空文字の場合は 0 (無効) を返す', () => {
    expect(parseEnvelopeRetentionDays('')).toBe(0);
  });

  it('不正値の場合は 0 (無効) を返す (throw しない)', () => {
    expect(parseEnvelopeRetentionDays('abc')).toBe(0);
    expect(parseEnvelopeRetentionDays('1.5')).toBe(0);
  });

  it('正常値をそのまま返す', () => {
    expect(parseEnvelopeRetentionDays('30')).toBe(30);
    expect(parseEnvelopeRetentionDays('90')).toBe(90);
  });

  it('0 および負値は 0 (無効) に丸められる', () => {
    expect(parseEnvelopeRetentionDays('0')).toBe(0);
    expect(parseEnvelopeRetentionDays('-5')).toBe(0);
  });

  it('上限を超える値はクランプされる', () => {
    expect(parseEnvelopeRetentionDays('99999')).toBe(MAX_ENVELOPE_RETENTION_DAYS);
  });
});

describe('getRetentionCutoff', () => {
  it('無効 (0) の場合は null を返す', () => {
    expect(getRetentionCutoff(new Date('2026-10-20T00:00:00.000Z'), 0)).toBeNull();
  });

  it('無効 (負値) の場合は null を返す', () => {
    expect(getRetentionCutoff(new Date('2026-10-20T00:00:00.000Z'), -1)).toBeNull();
  });

  it('now から N 日前の時刻を返す', () => {
    const now = new Date('2026-10-20T00:00:00.000Z');
    const cutoff = getRetentionCutoff(now, 30);

    expect(cutoff).toEqual(new Date('2026-09-20T00:00:00.000Z'));
  });

  it('月をまたいだ計算でも正しい日付を返す', () => {
    const now = new Date('2026-03-15T12:00:00.000Z');
    const cutoff = getRetentionCutoff(now, 30);

    expect(cutoff).toEqual(new Date('2026-02-13T12:00:00.000Z'));
  });

  it('入力の Date を破壊しない', () => {
    const now = new Date('2026-10-20T00:00:00.000Z');
    getRetentionCutoff(now, 1);

    expect(now.toISOString()).toBe('2026-10-20T00:00:00.000Z');
  });
});

describe('isEnvelopeExpired', () => {
  const cutoff = new Date('2026-09-20T00:00:00.000Z');

  it('cutoff より前の完了日時は期限切れ', () => {
    expect(isEnvelopeExpired(new Date('2026-09-19T23:59:59.000Z'), cutoff)).toBe(true);
  });

  it('cutoff と同時刻の完了日時は期限切れではない', () => {
    expect(isEnvelopeExpired(cutoff, cutoff)).toBe(false);
  });

  it('cutoff より後の完了日時は期限切れではない', () => {
    expect(isEnvelopeExpired(new Date('2026-10-01T00:00:00.000Z'), cutoff)).toBe(false);
  });
});
