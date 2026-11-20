import { ZEmailSchema } from '@documenso/lib/schemas/common';
import { ZNameSchema } from '@documenso/lib/types/name';
import { z } from 'zod';

export const ZCreateUserRequestSchema = z.object({
  email: ZEmailSchema,
  name: ZNameSchema,
});

export type TCreateUserRequest = z.infer<typeof ZCreateUserRequestSchema>;

export const ZCreateUserResponseSchema = z.object({
  userId: z.number(),
});

export type TCreateUserResponse = z.infer<typeof ZCreateUserResponseSchema>;
