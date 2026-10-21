import { getOptionalNonEmbedSession } from '@documenso/auth/server/lib/session/embed-session-restrictions';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { verifyEmbeddingPresignToken } from '@documenso/lib/server-only/embedding-presign/verify-embedding-presign-token';
import type { DocumentDataVersion } from '@documenso/lib/types/document';
import { sha256 } from '@documenso/lib/universal/crypto';
import { getFileServerSide } from '@documenso/lib/universal/upload/get-file.server';
import { prisma } from '@documenso/prisma';
import { sValidator } from '@hono/standard-validator';
import type { DocumentData, EnvelopeItem } from '@prisma/client';
import { type Context, Hono } from 'hono';
import { z } from 'zod';

import type { HonoEnv } from '../../../router';
import { checkEnvelopeFileAccess } from '../files.helpers';

const route = new Hono<HonoEnv>();

const ZGetEnvelopeItemPdfRequestParamsSchema = z.object({
  envelopeId: z.string().min(1),
  envelopeItemId: z.string().min(1),
  documentDataId: z.string().min(1),
  version: z.enum(['initial', 'current']),
});

const ZGetEnvelopeItemPdfRequestQuerySchema = z.object({
  presignToken: z.string().optional(),
});

/**
 * Returns a PDF file for an envelope item.
 */
route.get(
  '/envelope/:envelopeId/envelopeItem/:envelopeItemId/dataId/:documentDataId/:version/item.pdf',
  sValidator('param', ZGetEnvelopeItemPdfRequestParamsSchema),
  sValidator('query', ZGetEnvelopeItemPdfRequestQuerySchema),
  async (c) => {
    const { envelopeId, envelopeItemId, documentDataId, version } = c.req.valid('param');

    const { presignToken } = c.req.valid('query');

    const session = await getOptionalNonEmbedSession(c);

    let userId = session.user?.id;

    // Check presignToken if provided
    if (presignToken) {
      const verifiedToken = await verifyEmbeddingPresignToken({
        token: presignToken,
      }).catch(() => undefined);

      userId = verifiedToken?.userId;
    }

    if (!userId) {
      return c.json({ error: 'Not found' }, 404);
    }

    // Note: We authenticate whether the user can access this in the `getTeamById` below.
    const envelopeItem = await prisma.envelopeItem.findFirst({
      where: {
        id: envelopeItemId,
        envelopeId,
        documentDataId,
      },
      include: {
        documentData: true,
        envelope: {
          select: {
            id: true,
            type: true,
            teamId: true,
            templateType: true,
          },
        },
      },
    });

    if (!envelopeItem) {
      return c.json({ error: 'Not found' }, 404);
    }

    // Check whether the user has access to the document.
    const hasAccess = await checkEnvelopeFileAccess({
      userId,
      teamId: envelopeItem.envelope.teamId,
      envelopeType: envelopeItem.envelope.type,
      templateType: envelopeItem.envelope.templateType,
    });

    if (!hasAccess) {
      return c.json({ error: 'Not found' }, 404);
    }

    try {
      return await handleEnvelopeItemPdfRequest({
        c,
        envelopeItem,
        version,
        cacheStrategy: 'private',
      });
    } catch (error) {
      if (error instanceof AppError) {
        const { status, body } = AppError.toRestAPIError(error);

        return c.json({ error: body.message, code: error.code }, status);
      }

      throw error;
    }
  },
);

type HandleEnvelopeItemPdfRequestOptions = {
  c: Context<HonoEnv>;
  envelopeItem: EnvelopeItem & {
    documentData: DocumentData;
  };
  version: DocumentDataVersion;

  /**
   * The type of cache strategy to use.
   *
   * For access via tokens, we can use a public cache to allow the CDN to cache it.
   *
   * For access via session, we must use a private cache.
   */
  cacheStrategy: 'private' | 'public';
};

export const handleEnvelopeItemPdfRequest = async ({
  c,
  envelopeItem,
  version,
  cacheStrategy,
}: HandleEnvelopeItemPdfRequestOptions) => {
  // Determine which PDF data to use based on version requested.
  const documentDataToUse =
    version === 'current' ? envelopeItem.documentData.data : envelopeItem.documentData.initialData;

  // R-02: 保管期限ジョブにより PDF 実体が破棄された文書は縮退させる。
  if (documentDataToUse === '') {
    throw new AppError(AppErrorCode.DOCUMENT_DATA_PURGED, {
      message:
        'この文書は保管期限を過ぎたため、本文PDFは削除されました。締結証明書・監査ログは完了時に配信されています。監査記録は引き続き本システムで照会できます。',
      userMessage:
        'この文書は保管期限を過ぎたため、本文PDFは削除されました。締結証明書・監査ログは完了時に配信されています。監査記録は引き続き本システムで照会できます。',
      statusCode: 410,
    });
  }

  const etag = Buffer.from(sha256(documentDataToUse)).toString('hex');

  if (c.req.header('If-None-Match') === etag) {
    return c.status(304);
  }

  const file = await getFileServerSide({
    type: envelopeItem.documentData.type,
    data: documentDataToUse,
  }).catch((error) => {
    console.error(error);

    return null;
  });

  if (!file) {
    return c.json({ error: 'Not found' }, 404);
  }

  // Note: Only set these headers on success.
  c.header('Content-Type', 'application/pdf');
  c.header('ETag', etag);
  c.header('Cache-Control', `${cacheStrategy}, max-age=31536000, immutable`);

  return c.body(file);
};

export default route;
