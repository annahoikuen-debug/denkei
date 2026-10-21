import { z } from 'zod';

import type { JobDefinition } from '../../client/_internal/job';

/**
 * フェーズ2 ステップ5: OTP 送信メールジョブ定義
 */
const SEND_OTP_EMAIL_JOB_DEFINITION_SCHEMA = z.object({
  recipientId: z.number(),
  envelopeId: z.string(),
  otpCode: z.string().regex(/^\d{6}$/),
});

export const SEND_OTP_EMAIL_JOB_DEFINITION_ID = 'send.otp-email';

export type TSendOtpEmailJobDefinition = z.infer<typeof SEND_OTP_EMAIL_JOB_DEFINITION_SCHEMA>;

export const SEND_OTP_EMAIL_JOB_DEFINITION = {
  id: SEND_OTP_EMAIL_JOB_DEFINITION_ID,
  name: 'Send OTP Email',
  version: '1.0.0',
  trigger: {
    name: SEND_OTP_EMAIL_JOB_DEFINITION_ID,
    schema: SEND_OTP_EMAIL_JOB_DEFINITION_SCHEMA,
  },
  handler: async ({ payload, io }) => {
    const handler = await import('./send-otp-email.handler');
    await handler.run({ payload, io });
  },
} as const satisfies JobDefinition<typeof SEND_OTP_EMAIL_JOB_DEFINITION_ID, TSendOtpEmailJobDefinition>;
