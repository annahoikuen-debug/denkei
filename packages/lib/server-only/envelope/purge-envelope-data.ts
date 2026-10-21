import { prisma } from '@documenso/prisma';
import { DocumentDataType, DocumentStatus, EnvelopeType } from '@prisma/client';

import { DOCUMENT_AUDIT_LOG_TYPE } from '../../types/document-audit-logs';
import { alphaid } from '../../universal/id';
import { deleteFile } from '../../universal/upload/delete-file';
import { computeAuditLogHash } from '../document-audit-log-hash';

const PURGE_AUDIT_LOG_USER = {
  name: 'System',
  email: null as string | null,
};

/**
 * PostgreSQL jsonb はオブジェクトキーを「キー長 → バイト順」で並べ替えて保存する。
 * そのためインメモリの挿入順で JSON.stringify したペイロードは、DB 往復後の値と一致しない。
 * ハッシュチェーンは「DB から読み戻した値」で検証される(verifyAuditLogHashChain / バックフィル)ため、
 * 書き込み時に jsonb と同じ順序へ正規化してからハッシュを計算する必要がある。
 */
const normalizeForJsonb = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeForJsonb(item));
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => {
      if (a.length !== b.length) {
        return a.length - b.length;
      }

      return a < b ? -1 : a > b ? 1 : 0;
    });

    return Object.fromEntries(entries.map(([key, item]) => [key, normalizeForJsonb(item)]));
  }

  return value;
};

type PurgeExpiredEnvelopeDataOptions = {
  /** Envelopes completed before this instant are eligible for purge. */
  cutoff: Date;
  /** Maximum number of envelopes to process per run. Remaining ones are picked up on the next run. */
  take?: number;
};

export type PurgeExpiredEnvelopeDataResult = {
  processedCount: number;
};

/**
 * ストレージ最小化(R-01): 保管期限を過ぎた完了文書の PDF 実体と署名画像を破棄する。
 *
 * - 破棄対象: `DocumentData.data` / `initialData`(PDF実体) と `Signature.signatureImageAsBase64`
 * - 保持対象: 監査ログ(ハッシュチェーン)・文書メタデータ・宛先情報
 * - 破棄時には `DOCUMENT_DATA_PURGED` 監査ログを追記する。ハッシュは create 前に計算し、
 *   UPDATE を経由しないため WORM トリガーと衝突しない。
 * - 空文字 `''` を「破棄済み」の哨兵値として使用する(スキーマ変更不要、実PDFは必ず非空)。
 */
export const purgeExpiredEnvelopeData = async ({
  cutoff,
  take = 100,
}: PurgeExpiredEnvelopeDataOptions): Promise<PurgeExpiredEnvelopeDataResult> => {
  const envelopes = await prisma.envelope.findMany({
    where: {
      type: EnvelopeType.DOCUMENT,
      status: DocumentStatus.COMPLETED,
      deletedAt: null,
      completedAt: {
        lt: cutoff,
      },
      envelopeItems: {
        some: {
          documentData: {
            OR: [{ data: { not: '' } }, { initialData: { not: '' } }],
          },
        },
      },
    },
    select: {
      id: true,
    },
    take,
    orderBy: {
      completedAt: 'asc',
    },
  });

  let processedCount = 0;

  for (const envelope of envelopes) {
    const result = await purgeEnvelopeData({ envelopeId: envelope.id });

    if (result) {
      processedCount += 1;
    }
  }

  return { processedCount };
};

type PurgeEnvelopeDataOptions = {
  envelopeId: string;
};

export type PurgeEnvelopeDataResult = {
  envelopeId: string;
  purgedDocumentDataIds: string[];
  purgedSignatureCount: number;
};

/**
 * 単一エンベロープの PDF 実体と署名画像を破棄する(冪等)。
 *
 * @returns 破棄が実行された場合は結果、対象が存在しない・破棄済みの場合は null。
 */
export const purgeEnvelopeData = async ({
  envelopeId,
}: PurgeEnvelopeDataOptions): Promise<PurgeEnvelopeDataResult | null> => {
  return await prisma.$transaction(async (tx) => {
    const envelope = await tx.envelope.findFirst({
      where: {
        id: envelopeId,
        type: EnvelopeType.DOCUMENT,
        status: DocumentStatus.COMPLETED,
      },
      select: {
        id: true,
        envelopeItems: {
          select: {
            id: true,
            documentData: {
              select: {
                id: true,
                type: true,
                data: true,
                initialData: true,
              },
            },
          },
        },
      },
    });

    if (!envelope) {
      return null;
    }

    const itemsWithData = envelope.envelopeItems.filter(
      (item) => item.documentData.data !== '' || item.documentData.initialData !== '',
    );

    // 冪等: 破棄すべき実体が残っていない場合は何もしない。
    if (itemsWithData.length === 0) {
      return null;
    }

    const purgedDocumentDataIds: string[] = [];

    for (const item of itemsWithData) {
      const { documentData } = item;

      if (documentData.type === DocumentDataType.S3_PATH) {
        // S3 トランスポートでは列の値が実体へのパスのため、実体を削除してから列を空化する。
        for (const path of [documentData.data, documentData.initialData]) {
          if (path) {
            await deleteFile({ type: DocumentDataType.S3_PATH, data: path });
          }
        }
      }

      await tx.documentData.update({
        where: {
          id: documentData.id,
        },
        data: {
          data: '',
          initialData: '',
        },
      });

      purgedDocumentDataIds.push(documentData.id);
    }

    const purgedSignatures = await tx.signature.updateMany({
      where: {
        recipient: {
          envelopeId,
        },
        signatureImageAsBase64: {
          not: null,
        },
      },
      data: {
        signatureImageAsBase64: null,
      },
    });

    // 監査ログは create 前にハッシュを計算して 1 回で書き込む(WORM トリガーは UPDATE/DELETE を禁止するため)。
    const previous = await tx.documentAuditLog.findFirst({
      where: {
        envelopeId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        hash: true,
      },
    });

    const auditLogId = alphaid();
    const auditLogCreatedAt = new Date();
    // jsonb 往復後の値と一致させるため、保存値もハッシュ計算入力も正規化済みオブジェクトを使用する。
    const auditLogData = normalizeForJsonb({
      purgedDocumentDataIds,
      purgedSignatureCount: purgedSignatures.count,
    });
    const prevHash = previous?.hash ?? '';
    const hash = computeAuditLogHash(
      {
        id: auditLogId,
        createdAt: auditLogCreatedAt,
        type: DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_DATA_PURGED,
        data: auditLogData,
      },
      prevHash,
    );

    await tx.documentAuditLog.create({
      data: {
        id: auditLogId,
        createdAt: auditLogCreatedAt,
        envelopeId,
        type: DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_DATA_PURGED,
        data: auditLogData,
        prevHash,
        hash,
        name: PURGE_AUDIT_LOG_USER.name,
        email: PURGE_AUDIT_LOG_USER.email,
      },
    });

    return {
      envelopeId,
      purgedDocumentDataIds,
      purgedSignatureCount: purgedSignatures.count,
    };
  });
};
