import { findDocuments } from '@documenso/lib/server-only/document/find-documents';
import { buildElectronicLedgerCsv, type ElectronicLedgerCsvRow } from '@documenso/lib/universal/electronic-ledger-csv';
import { ExtendedDocumentStatus } from '@documenso/prisma/types/extended-document-status';

import { authenticatedProcedure } from '../trpc';
import {
  ZDownloadDocumentsCsvRequestSchema,
  ZDownloadDocumentsCsvResponseSchema,
} from './download-documents-csv.types';

export const downloadDocumentsCsvRoute = authenticatedProcedure
  .input(ZDownloadDocumentsCsvRequestSchema)
  .output(ZDownloadDocumentsCsvResponseSchema)
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

    // For CSV export, we fetch all matching documents (no pagination limit)
    const documentsResult = await findDocuments({
      userId: user.id,
      teamId,
      query,
      templateId,
      page: 1,
      perPage: 10000, // Large limit to get all matching documents
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
      useWindowedCount: false, // Exact count for CSV
    });

    // Transform to CSV rows
    const csvRows: ElectronicLedgerCsvRow[] = documentsResult.data.map((doc) => ({
      documentId: doc.id,
      title: doc.title,
      contractType: doc.documentMeta?.contractType ?? null,
      counterpartyName: doc.documentMeta?.counterpartyName ?? null,
      contractAmount: doc.documentMeta?.contractAmount ?? null,
      contractDate: doc.documentMeta?.contractDate ? doc.documentMeta.contractDate.toISOString().split('T')[0] : null,
      completedAt: doc.completedAt?.toISOString() ?? null,
    }));

    const csv = buildElectronicLedgerCsv(csvRows);

    const now = new Date();
    const filename = `documenso-電子帳簿保存法-CSV-${now.toISOString().split('T')[0]}.csv`;

    return {
      csv,
      filename,
    };
  });
