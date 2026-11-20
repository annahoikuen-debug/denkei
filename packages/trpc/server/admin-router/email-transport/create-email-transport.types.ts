import { ZEmailSchema } from '@documenso/lib/schemas/common';
import { ZEmailTransportConfigSchema } from '@documenso/lib/server-only/email/email-transport-config';
import { ZNameSchema } from '@documenso/lib/types/name';
import { z } from 'zod';

export const ZCreateEmailTransportRequestSchema = z.object({
  name: ZNameSchema,
  fromName: ZNameSchema,
  fromAddress: ZEmailSchema,
  config: ZEmailTransportConfigSchema,
});

export const ZCreateEmailTransportResponseSchema = z.object({
  id: z.string(),
});

export type TCreateEmailTransportRequest = z.infer<typeof ZCreateEmailTransportRequestSchema>;
