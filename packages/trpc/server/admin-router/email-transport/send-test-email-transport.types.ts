import { ZEmailSchema } from '@documenso/lib/schemas/common';
import { z } from 'zod';

export const ZSendTestEmailTransportRequestSchema = z.object({
  id: z.string(),
  to: ZEmailSchema,
});

export const ZSendTestEmailTransportResponseSchema = z.void();

export type TSendTestEmailTransportResponse = z.infer<typeof ZSendTestEmailTransportResponseSchema>;
