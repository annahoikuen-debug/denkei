import { findDocuments } from '@documenso/lib/server-only/document/find-documents';
import { getStats } from '@documenso/lib/server-only/document/get-stats';
import { mapEnvelopesToDocumentMany } from '@documenso/lib/utils/document';
import { ExtendedDocumentStatus } from '@documenso/prisma/types/extended-document-status';

import { authenticatedProcedure } from '../trpc';
import {
  ZFindDocumentsInternalRequestSchema,
  ZFindDocumentsInternalResponseSchema,
} from './find-documents-internal.types';

export const findDocumentsInternalRoute = authenticatedProcedure
  .input(ZFindDocumentsInternalRequestSchema)
  .output(ZFindDocumentsInternalResponseSchema)
  .query(async ({ input, ctx }) => {
    const { user, teamId } = ctx;

    const {
      query,
      templateId,
      page,
      perPage,
      orderByDirection,
      orderByColumn,
      source,
      status,
      hasExpiredRecipients,
      period,
      senderIds,
      folderId,
      contractType,
      counterpartyName,
      contractAmount,
      contractDateFrom,
      contractDateTo,
    } = input;

    const [stats, documents] = await Promise.all([
      getStats({
        userId: user.id,
        teamId,
        period,
        search: query,
        folderId,
        senderIds,
      }),
      findDocuments({
        userId: user.id,
        teamId,
        query,
        templateId,
        page,
        perPage,
        source,
        status: status ?? ExtendedDocumentStatus.ALL,
        period,
        senderIds,
        folderId,
        hasExpiredRecipients,
        orderBy: orderByColumn ? { column: orderByColumn, direction: orderByDirection } : undefined,
        contractType,
        counterpartyName,
        contractAmount,
        contractDateFrom,
        contractDateTo,
      }),
    ]);

    return {
      ...documents,
      data: documents.data.map((envelope) => mapEnvelopesToDocumentMany(envelope)),
      stats,
    };
  });
