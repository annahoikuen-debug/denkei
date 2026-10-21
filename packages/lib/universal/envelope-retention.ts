/**
 * Envelope retention: pure helpers for the `NEXT_PRIVATE_ENVELOPE_RETENTION_DAYS`
 * setting and retention cutoff computation.
 *
 * Semantics:
 * - Unset / empty / invalid / <= 0 / > MAX -> disabled (0).
 * - A valid positive value (1..3650) enables the daily purge sweep.
 */
export const MAX_ENVELOPE_RETENTION_DAYS = 3650;

export const parseEnvelopeRetentionDays = (raw: string | undefined | null): number => {
  if (raw === undefined || raw === null || raw === '') {
    return 0;
  }

  // 整数文字列のみ許容する(小数・空白混在などの不正値は無効として扱う)。
  if (!/^\d+$/.test(raw)) {
    return 0;
  }

  const parsed = Number.parseInt(raw, 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return 0;
  }

  return Math.min(parsed, MAX_ENVELOPE_RETENTION_DAYS);
};

/**
 * Returns the retention cutoff date: envelopes completed before this instant
 * are eligible for purge. Returns `null` when retention is disabled.
 */
export const getRetentionCutoff = (now: Date, retentionDays: number): Date | null => {
  if (retentionDays <= 0) {
    return null;
  }

  const cutoff = new Date(now.getTime());

  cutoff.setUTCDate(cutoff.getUTCDate() - retentionDays);

  return cutoff;
};

export const isEnvelopeExpired = (completedAt: Date, cutoff: Date): boolean => completedAt < cutoff;
