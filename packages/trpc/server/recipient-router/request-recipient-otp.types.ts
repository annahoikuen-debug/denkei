import { z } from 'zod';

export const ZRequestRecipientOtpRequestSchema = z.object({
  token: z.string().min(1),
});

export const ZRequestRecipientOtpResponseSchema = z.object({
  success: z.boolean(),
  /** クールダウン中の場合は rate-limited */
  reason: z.enum(['rate-limited']).optional(),
  expiresAt: z.date().optional(),
  /** 残り再送クールダウン秒数 */
  cooldownSeconds: z.number(),
});

export type TRequestRecipientOtpRequest = z.infer<typeof ZRequestRecipientOtpRequestSchema>;
export type TRequestRecipientOtpResponse = z.infer<typeof ZRequestRecipientOtpResponseSchema>;
