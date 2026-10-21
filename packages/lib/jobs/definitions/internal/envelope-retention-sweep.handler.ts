import { getRetentionCutoff, parseEnvelopeRetentionDays } from '@documenso/lib/universal/envelope-retention';
import { env } from '@documenso/lib/utils/env';

import type { JobRunIO } from '../../client/_internal/job';
import type { TEnvelopeRetentionSweepJobDefinition } from './envelope-retention-sweep';

export const run = async ({
  payload: _payload,
  io,
}: {
  payload: TEnvelopeRetentionSweepJobDefinition;
  io: JobRunIO;
}) => {
  const retentionDays = parseEnvelopeRetentionDays(env('NEXT_PRIVATE_ENVELOPE_RETENTION_DAYS'));

  if (retentionDays === 0) {
    io.logger.info('Envelope retention is disabled (NEXT_PRIVATE_ENVELOPE_RETENTION_DAYS is unset or 0)');
    return;
  }

  const cutoff = getRetentionCutoff(new Date(), retentionDays);

  if (!cutoff) {
    return;
  }

  io.logger.info(
    `Purging completed envelopes finished before ${cutoff.toISOString()} (retention: ${retentionDays} days)`,
  );

  const { purgeExpiredEnvelopeData } = await import('../../../server-only/envelope/purge-envelope-data');

  const result = await purgeExpiredEnvelopeData({ cutoff });

  io.logger.info(`Purged ${result.processedCount} envelope(s) past the retention period`);
};
