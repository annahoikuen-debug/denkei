import { ZDocumentManySchema } from '@documenso/lib/types/document';
import { ZFindResultResponse, ZFindSearchParamsSchema } from '@documenso/lib/types/search-params';
import { ExtendedDocumentStatus } from '@documenso/prisma/types/extended-document-status';
import { EnvelopeType } from '@prisma/client';
import { z } from 'zod';

export const ZFindDocumentsInternalRequestSchema = ZFindSearchParamsSchema.extend({
  period: z.enum(['7d', '14d', '30d']).optional(),
  senderIds: z.array(z.number()).optional(),
  status: z.nativeEnum(ExtendedDocumentStatus).optional(),
  folderId: z.string().optional(),
  templateId: z.number().optional(),
  orderByDirection: z.enum(['asc', 'desc']).optional(),
  orderByColumn: z.enum(['createdAt']).optional(),
  source: z.nativeEnum(EnvelopeType).optional(),
  hasExpiredRecipients: z.boolean().optional(),
});

export const ZFindDocumentsInternalResponseSchema = ZFindResultResponse.extend({
  data: ZDocumentManySchema.array(),
  stats: z.object({
    [ExtendedDocumentStatus.DRAFT]: z.number(),
    [ExtendedDocumentStatus.PENDING]: z.number(),
    [ExtendedDocumentStatus.COMPLETED]: z.number(),
    [ExtendedDocumentStatus.REJECTED]: z.number(),
    [ExtendedDocumentStatus.CANCELLED]: z.number(),
    [ExtendedDocumentStatus.EXPIRED]: z.number(),
    [ExtendedDocumentStatus.INBOX]: z.number(),
    [ExtendedDocumentStatus.ALL]: z.number(),
  }),
});

export type TFindDocumentsInternalRequest = z.infer<typeof ZFindDocumentsInternalRequestSchema>;
export type TFindDocumentsInternalResponse = z.infer<typeof ZFindDocumentsInternalResponseSchema>;
