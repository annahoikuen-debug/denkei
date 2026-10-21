import { ZFindSearchParamsSchema } from '@documenso/lib/types/search-params';
import { ExtendedDocumentStatus } from '@documenso/prisma/types/extended-document-status';
import { DocumentSource } from '@prisma/client';
import { z } from 'zod';

import type { TrpcRouteMeta } from '../trpc';

export const ZDownloadDocumentsCsvMeta: TrpcRouteMeta = {
  openapi: {
    method: 'GET',
    path: '/document/download-csv',
    summary: 'Download documents as CSV (電帳法対応)',
    description: 'Export filtered documents as CSV with electronic bookkeeping law compliance fields',
    tags: ['Document'],
  },
};

export const ZDownloadDocumentsCsvRequestSchema = ZFindSearchParamsSchema.extend({
  templateId: z.number().optional(),
  source: z.nativeEnum(DocumentSource).optional(),
  status: z.nativeEnum(ExtendedDocumentStatus).optional(),
  hasExpiredRecipients: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  period: z.enum(['7d', '14d', '30d']).optional(),
  senderIds: z.array(z.number()).optional(),
  folderId: z.string().optional(),
  orderByColumn: z.enum(['createdAt']).optional(),
  orderByDirection: z.enum(['asc', 'desc']).default('desc'),
  contractType: z.string().optional(),
  counterpartyName: z.string().optional(),
  contractAmount: z.string().optional(),
  contractDateFrom: z.string().optional(),
  contractDateTo: z.string().optional(),
});

export const ZDownloadDocumentsCsvResponseSchema = z.object({
  csv: z.string(),
  filename: z.string(),
});

export type TDownloadDocumentsCsvRequest = z.infer<typeof ZDownloadDocumentsCsvRequestSchema>;
export type TDownloadDocumentsCsvResponse = z.infer<typeof ZDownloadDocumentsCsvResponseSchema>;
