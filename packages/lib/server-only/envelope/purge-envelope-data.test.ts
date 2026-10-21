import { nanoid } from 'nanoid';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

// deleteFile は S3 トランスポート時のみ外部削除を行う。S3 テストケースで呼び出しを検証するためモックする。
const deleteFileMock = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock('../../universal/upload/delete-file', () => ({
  deleteFile: deleteFileMock,
}));

import { prisma } from '@documenso/prisma';
import { DocumentDataType, DocumentStatus, EnvelopeType, FieldType } from '@prisma/client';

import { DEFAULT_DOCUMENT_EMAIL_SETTINGS } from '../../types/document-email';
import { computeAuditLogHash } from '../document-audit-log-hash';
import { purgeEnvelopeData, purgeExpiredEnvelopeData } from './purge-envelope-data';

const hasDatabase = Boolean(process.env.NEXT_PRIVATE_DATABASE_URL || process.env.DATABASE_URL);
const describeDb = hasDatabase ? describe : describe.skip;

const SAMPLE_PDF_BASE64 = Buffer.from('%PDF-1.7 sample document for retention test').toString('base64');

type TestFixture = {
  userId: number;
  teamId: number;
  organisationId: string;
  envelopeId: string;
  documentMetaId: string;
  documentDataId: string;
  recipientId: number;
  fieldId: number;
};

/**
 * テスト用フィクスチャ: User → Organisation → Team → Envelope(COMPLETED) → EnvelopeItem → DocumentData
 * (+ Recipient/Field/Signature、監査ログ 1 件)。全 ID に runId を含めて他データと分離する。
 */
const createCompletedEnvelopeFixture = async ({
  runId,
  completedAt,
  withSignature = false,
  withAuditLog = true,
  envelopeType = EnvelopeType.DOCUMENT,
}: {
  runId: string;
  completedAt: Date;
  withSignature?: boolean;
  withAuditLog?: boolean;
  envelopeType?: EnvelopeType;
}): Promise<TestFixture> => {
  const user = await prisma.user.create({
    data: {
      name: `retention-test-${runId}`,
      email: `retention-${runId}@example.com`,
    },
  });

  const claim = await prisma.organisationClaim.create({
    data: {
      id: `claim_${runId}`,
      teamCount: 1,
      memberCount: 1,
      envelopeItemCount: 10,
      recipientCount: 10,
      flags: {},
      documentRateLimits: [],
      emailRateLimits: [],
      apiRateLimits: [],
    },
  });

  await prisma.organisationGlobalSettings.create({
    data: {
      id: `orgsettings_${runId}`,
      emailDocumentSettings: DEFAULT_DOCUMENT_EMAIL_SETTINGS,
    },
  });

  await prisma.organisationAuthenticationPortal.create({
    data: {
      id: `portal_${runId}`,
    },
  });

  await prisma.organisation.create({
    data: {
      id: `org_${runId}`,
      type: 'ORGANISATION',
      name: `retention-org-${runId}`,
      url: `retention-org-${runId}`,
      organisationClaimId: claim.id,
      ownerUserId: user.id,
      organisationGlobalSettingsId: `orgsettings_${runId}`,
      organisationAuthenticationPortalId: `portal_${runId}`,
    },
  });

  await prisma.teamGlobalSettings.create({
    data: {
      id: `teamsettings_${runId}`,
    },
  });

  const team = await prisma.team.create({
    data: {
      name: `retention-team-${runId}`,
      url: `retention-team-${runId}`,
      organisationId: `org_${runId}`,
      teamGlobalSettingsId: `teamsettings_${runId}`,
    },
  });

  const documentMetaId = `meta_${runId}`;
  await prisma.documentMeta.create({
    data: {
      id: documentMetaId,
    },
  });

  const documentDataId = `docdata_${runId}`;
  await prisma.documentData.create({
    data: {
      id: documentDataId,
      type: DocumentDataType.BYTES_64,
      data: SAMPLE_PDF_BASE64,
      initialData: SAMPLE_PDF_BASE64,
    },
  });

  const envelopeId = `envelope_${runId}`;
  await prisma.envelope.create({
    data: {
      id: envelopeId,
      secondaryId: `secondary_${runId}`,
      type: envelopeType,
      title: `Retention test ${runId}`,
      status: DocumentStatus.COMPLETED,
      source: 'DOCUMENT',
      signatureLevel: 'NONE',
      internalVersion: 1,
      documentMetaId,
      userId: user.id,
      teamId: team.id,
      completedAt,
    },
  });

  await prisma.envelopeItem.create({
    data: {
      id: `item_${runId}`,
      title: `Retention test ${runId}`,
      order: 1,
      documentDataId,
      envelopeId,
    },
  });

  const recipient = await prisma.recipient.create({
    data: {
      envelopeId,
      email: `recipient-${runId}@example.com`,
      name: 'Retention Recipient',
      token: `token_${runId}`,
      signedAt: completedAt,
    },
  });

  let fieldId = 0;

  if (withSignature) {
    const field = await prisma.field.create({
      data: {
        envelopeId,
        envelopeItemId: `item_${runId}`,
        recipientId: recipient.id,
        type: FieldType.SIGNATURE,
        page: 1,
        customText: '',
        inserted: true,
      },
    });

    fieldId = field.id;

    await prisma.signature.create({
      data: {
        recipientId: recipient.id,
        fieldId: field.id,
        signatureImageAsBase64: SAMPLE_PDF_BASE64,
      },
    });
  }

  if (withAuditLog) {
    const auditLogId = `audit_seed_${runId}`;
    const createdAt = new Date(completedAt.getTime() + 1000);
    const seedData = { transactionId: `tx_${runId}` };
    const prevHash = '';
    const hash = computeAuditLogHash(
      {
        id: auditLogId,
        createdAt,
        type: 'DOCUMENT_COMPLETED',
        data: seedData,
      },
      prevHash,
    );

    await prisma.$executeRaw`
      INSERT INTO "DocumentAuditLog" ("id", "createdAt", "envelopeId", "type", "data", "prevHash", "hash")
      VALUES (${auditLogId}, ${createdAt}, ${envelopeId}, ${'DOCUMENT_COMPLETED'}, ${JSON.stringify(seedData)}::jsonb, ${prevHash}, ${hash})
    `;
  }

  return {
    userId: user.id,
    teamId: team.id,
    organisationId: `org_${runId}`,
    envelopeId,
    documentMetaId,
    documentDataId,
    recipientId: recipient.id,
    fieldId,
  };
};

/**
 * WORM トリガーを一時的に無効化してテストフィクスチャを削除する。
 * (通常の prisma クライアントは拡張レイヤーで audit log の削除を禁止しているため raw SQL を使う)
 */
const cleanupFixture = async ({ runId }: { runId: string }) => {
  await prisma.$executeRawUnsafe(`ALTER TABLE "DocumentAuditLog" DISABLE TRIGGER USER;`);

  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "DocumentAuditLog" WHERE "id" LIKE 'audit_seed_${runId}' OR "id" LIKE 'audit_purge_${runId}' OR "envelopeId" = ${`'envelope_${runId}'`};`,
    );
    await prisma.envelope.deleteMany({ where: { id: `envelope_${runId}` } });
    await prisma.documentData.deleteMany({ where: { id: `docdata_${runId}` } });
    await prisma.documentMeta.deleteMany({ where: { id: `meta_${runId}` } });
    await prisma.team.deleteMany({ where: { url: `retention-team-${runId}` } });
    await prisma.teamGlobalSettings.deleteMany({ where: { id: `teamsettings_${runId}` } });
    await prisma.organisation.deleteMany({ where: { id: `org_${runId}` } });
    await prisma.organisationClaim.deleteMany({ where: { id: `claim_${runId}` } });
    await prisma.organisationGlobalSettings.deleteMany({ where: { id: `orgsettings_${runId}` } });
    await prisma.organisationAuthenticationPortal.deleteMany({ where: { id: `portal_${runId}` } });
    await prisma.user.deleteMany({ where: { email: `retention-${runId}@example.com` } });
  } finally {
    await prisma.$executeRawUnsafe(`ALTER TABLE "DocumentAuditLog" ENABLE TRIGGER USER;`);
  }
};

describeDb('purgeEnvelopeData / purgeExpiredEnvelopeData (要 DB)', () => {
  beforeAll(async () => {
    // DB 接続確認(接続できない場合はテスト全体を失敗させるのではなく明示的に通知)
    await prisma.$queryRaw`SELECT 1`;
  });

  afterEach(() => {
    deleteFileMock.mockClear();
  });

  it('期限超過の完了文書のみ破棄し、期限内の文書は無変更', async () => {
    const expiredRunId = nanoid(10);
    const activeRunId = nanoid(10);
    const cutoff = new Date('2026-10-01T00:00:00.000Z');

    const expired = await createCompletedEnvelopeFixture({
      runId: expiredRunId,
      completedAt: new Date('2026-08-01T00:00:00.000Z'),
      withAuditLog: false,
    });

    const active = await createCompletedEnvelopeFixture({
      runId: activeRunId,
      completedAt: new Date('2026-10-15T00:00:00.000Z'),
      withAuditLog: false,
    });

    try {
      const result = await purgeExpiredEnvelopeData({ cutoff });

      expect(result.processedCount).toBeGreaterThanOrEqual(1);

      const expiredData = await prisma.documentData.findUniqueOrThrow({
        where: { id: expired.documentDataId },
      });
      expect(expiredData.data).toBe('');
      expect(expiredData.initialData).toBe('');

      const activeData = await prisma.documentData.findUniqueOrThrow({
        where: { id: active.documentDataId },
      });
      expect(activeData.data).toBe(SAMPLE_PDF_BASE64);
      expect(activeData.initialData).toBe(SAMPLE_PDF_BASE64);
    } finally {
      await cleanupFixture({ runId: expiredRunId });
      await cleanupFixture({ runId: activeRunId });
    }
  });

  it('署名画像が破棄される', async () => {
    const runId = nanoid(10);

    const fixture = await createCompletedEnvelopeFixture({
      runId,
      completedAt: new Date('2026-08-01T00:00:00.000Z'),
      withSignature: true,
      withAuditLog: false,
    });

    try {
      await purgeExpiredEnvelopeData({ cutoff: new Date('2026-10-01T00:00:00.000Z') });

      const signature = await prisma.signature.findFirstOrThrow({
        where: { recipientId: fixture.recipientId },
      });
      expect(signature.signatureImageAsBase64).toBeNull();
    } finally {
      await cleanupFixture({ runId });
    }
  });

  it('破棄時に DOCUMENT_DATA_PURGED 監査ログが追記され、ハッシュチェーンが継続する', async () => {
    const runId = nanoid(10);

    const fixture = await createCompletedEnvelopeFixture({
      runId,
      completedAt: new Date('2026-08-01T00:00:00.000Z'),
      withAuditLog: true,
    });

    try {
      await purgeEnvelopeData({ envelopeId: fixture.envelopeId });

      const logs = await prisma.$queryRaw<
        { id: string; type: string; createdat: Date; prevhash: string; hash: string; data: unknown }[]
      >`SELECT "id", "type", "createdAt" as "createdat", "prevHash" as "prevhash", "hash", "data" FROM "DocumentAuditLog" WHERE "envelopeId" = ${fixture.envelopeId} ORDER BY "createdAt" ASC`;

      expect(logs).toHaveLength(2);

      const [seedLog, purgeLog] = logs;

      expect(purgeLog.type).toBe('DOCUMENT_DATA_PURGED');
      expect(purgeLog.prevhash).toBe(seedLog.hash);

      // 追記されたログのハッシュが完全検証できる
      const computed = computeAuditLogHash(
        {
          id: purgeLog.id,
          createdAt: purgeLog.createdat,
          type: purgeLog.type,
          data: purgeLog.data,
        },
        purgeLog.prevhash,
      );
      expect(computed).toBe(purgeLog.hash);
    } finally {
      await cleanupFixture({ runId });
    }
  });

  it('再実行で冪等(2 回目は処理 0 件)', async () => {
    const runId = nanoid(10);

    const fixture = await createCompletedEnvelopeFixture({
      runId,
      completedAt: new Date('2026-08-01T00:00:00.000Z'),
      withAuditLog: false,
    });

    try {
      const first = await purgeEnvelopeData({ envelopeId: fixture.envelopeId });
      expect(first).not.toBeNull();

      const second = await purgeEnvelopeData({ envelopeId: fixture.envelopeId });
      expect(second).toBeNull();
    } finally {
      await cleanupFixture({ runId });
    }
  });

  it('テンプレート(type=TEMPLATE)は破棄しない', async () => {
    const runId = nanoid(10);

    const fixture = await createCompletedEnvelopeFixture({
      runId,
      completedAt: new Date('2026-08-01T00:00:00.000Z'),
      withAuditLog: false,
      envelopeType: EnvelopeType.TEMPLATE,
    });

    try {
      const result = await purgeEnvelopeData({ envelopeId: fixture.envelopeId });
      expect(result).toBeNull();

      const documentData = await prisma.documentData.findUniqueOrThrow({
        where: { id: fixture.documentDataId },
      });
      expect(documentData.data).toBe(SAMPLE_PDF_BASE64);
    } finally {
      await cleanupFixture({ runId });
    }
  });

  it('S3_PATH の DocumentData は deleteFile 経由で実体削除される', async () => {
    const runId = nanoid(10);
    const s3Key = `retention-test/${runId}.pdf`;

    const fixture = await createCompletedEnvelopeFixture({
      runId,
      completedAt: new Date('2026-08-01T00:00:00.000Z'),
      withAuditLog: false,
    });

    await prisma.documentData.update({
      where: { id: fixture.documentDataId },
      data: { type: DocumentDataType.S3_PATH, data: s3Key, initialData: s3Key },
    });

    try {
      const result = await purgeEnvelopeData({ envelopeId: fixture.envelopeId });
      expect(result).not.toBeNull();

      expect(deleteFileMock).toHaveBeenCalledWith({ type: DocumentDataType.S3_PATH, data: s3Key });

      const documentData = await prisma.documentData.findUniqueOrThrow({
        where: { id: fixture.documentDataId },
      });
      expect(documentData.data).toBe('');
    } finally {
      await cleanupFixture({ runId });
    }
  });

  it('WORM トリガーにより DocumentAuditLog の UPDATE が DB レベルで拒否される', async () => {
    const runId = nanoid(10);

    const fixture = await createCompletedEnvelopeFixture({
      runId,
      completedAt: new Date('2026-08-01T00:00:00.000Z'),
      withAuditLog: true,
    });

    try {
      await expect(
        prisma.$executeRawUnsafe(
          `UPDATE "DocumentAuditLog" SET "type" = "type" WHERE "envelopeId" = ${`'${fixture.envelopeId}'`}`,
        ),
      ).rejects.toThrow(/append-only \(WORM\)/i);
    } finally {
      await cleanupFixture({ runId });
    }
  });
});
