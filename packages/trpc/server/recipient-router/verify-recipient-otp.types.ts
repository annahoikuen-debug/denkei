import { z } from 'zod';

export const ZVerifyRecipientOtpRequestSchema = z.object({
  token: z.string().min(1),
  otp: z.string().regex(/^\d{6}$/),
});

export const ZVerifyRecipientOtpResponseSchema = z.object({
  status: z.enum(['success', 'invalid', 'expired', 'locked', 'consumed', 'malformed']),
  maxAttempts: z.number(),
  remainingAttempts: z.number(),
  cooldownSeconds: z.number(),
  isLocked: z.boolean(),
});

export type TVerifyRecipientOtpRequest = z.infer<typeof ZVerifyRecipientOtpRequestSchema>;
export type TVerifyRecipientOtpResponse = z.infer<typeof ZVerifyRecipientOtpResponseSchema>;
