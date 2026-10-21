import { z } from 'zod';

import type { JobDefinition } from '../../client/_internal/job';

const ENVELOPE_RETENTION_SWEEP_JOB_DEFINITION_ID = 'internal.envelope-retention-sweep';

const ENVELOPE_RETENTION_SWEEP_JOB_DEFINITION_SCHEMA = z.object({});

export type TEnvelopeRetentionSweepJobDefinition = z.infer<typeof ENVELOPE_RETENTION_SWEEP_JOB_DEFINITION_SCHEMA>;

export const ENVELOPE_RETENTION_SWEEP_JOB_DEFINITION = {
  id: ENVELOPE_RETENTION_SWEEP_JOB_DEFINITION_ID,
  name: 'Envelope Retention Sweep',
  version: '1.0.0',
  trigger: {
    name: ENVELOPE_RETENTION_SWEEP_JOB_DEFINITION_ID,
    schema: ENVELOPE_RETENTION_SWEEP_JOB_DEFINITION_SCHEMA,
    cron: '0 19 * * *', // Daily at 19:00 UTC (= 04:00 JST).
  },
  handler: async ({ payload, io }) => {
    const handler = await import('./envelope-retention-sweep.handler');

    await handler.run({ payload, io });
  },
} as const satisfies JobDefinition<
  typeof ENVELOPE_RETENTION_SWEEP_JOB_DEFINITION_ID,
  TEnvelopeRetentionSweepJobDefinition
>;
