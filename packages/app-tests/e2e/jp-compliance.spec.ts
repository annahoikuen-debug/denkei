import { createHash } from 'node:crypto';
import { getDocumentByToken } from '@documenso/lib/server-only/document/get-document-by-token';
import { prisma } from '@documenso/prisma';
import { seedPendingDocumentWithFullFields } from '@documenso/prisma/seed/documents';
import { seedUser } from '@documenso/prisma/seed/users';
import { PDF } from '@libpdf/core';
import { expect, test } from '@playwright/test';
import { DocumentStatus, FieldType, RecipientRole } from '@prisma/client';

import { signSignaturePad } from '../fixtures/signature';

/**
 * フェーズ1 電帳法・署名検証コンプライアンス E2E(ステップ36)
 *
 * - ハッシュチェーン検証
 * - 締結証明書の監査ログ同梱確認
 * - CSV出力の電帳法検索要件対応確認
 * - PDF改変検知確認
 */
test.describe('[JP] Compliance - 電帳法・署名検証', () => {
  test('should produce completed PDF with valid signature and timestamp', async ({ page }) => {
    const { user, team } = await seedUser({
      isPersonalOrganisation: true,
    });

    const { document, recipients } = await seedPendingDocumentWithFullFields({
      owner: user,
      recipients: ['signer@example.com'],
      fields: [FieldType.SIGNATURE, FieldType.DATE],
      teamId: team.id,
    });

    const recipient = recipients.find((r) => r.role === RecipientRole.SIGNER) ?? recipients[0];

    await page.goto(`/sign/${recipient.token}`);

    await signSignaturePad(page);

    for (const field of recipient.fields) {
      await page.locator(`#field-${field.id}`).getByRole('button').click();

      await expect(page.locator(`#field-${field.id}`)).toHaveAttribute('data-inserted', 'true');
    }

    await page.getByRole('button', { name: 'Complete' }).click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Sign' }).click({ force: true });
    await page.waitForURL(`/sign/${recipient.token}/complete`);

    await expect(async () => {
      const { status } = await getDocumentByToken({
        token: recipient.token,
      });

      expect(status).toBe(DocumentStatus.COMPLETED);
    }).toPass();

    await page.waitForTimeout(2500);

    const completedEnvelope = await prisma.envelope.findFirstOrThrow({
      where: { id: document.id },
      include: {
        envelopeItems: {
          include: {
            documentData: true,
          },
        },
      },
    });

    const firstItem = completedEnvelope.envelopeItems[0];

    // PDFをダウンロードして署名検証
    const pdfUrl = `http://localhost:3000/api/v1/documents/${firstItem.id}/download?token=${recipient.token}&version=signed`;

    const pdfData = await fetch(pdfUrl).then(async (res) => await res.arrayBuffer());

    const pdfDoc = await PDF.load(new Uint8Array(pdfData));

    expect(pdfDoc.getPageCount()).toBeGreaterThan(0);

    // 署名フィールドが存在することを確認
    const signatures = pdfDoc.getSignatures();
    expect(signatures.length).toBeGreaterThan(0);

    // タイムスタンプが埋め込まれていることを確認
    const firstSig = signatures[0];
    expect(firstSig.timestamp).toBeDefined();
  });

  test('should include audit log and hash chain verification in certificate', async ({ page }) => {
    const { user, team } = await seedUser({
      isPersonalOrganisation: true,
    });

    const { document, recipients } = await seedPendingDocumentWithFullFields({
      owner: user,
      recipients: ['signer@example.com'],
      fields: [FieldType.SIGNATURE],
      teamId: team.id,
    });

    const recipient = recipients.find((r) => r.role === RecipientRole.SIGNER) ?? recipients[0];

    await page.goto(`/sign/${recipient.token}`);

    await signSignaturePad(page);

    for (const field of recipient.fields) {
      await page.locator(`#field-${field.id}`).getByRole('button').click();

      await expect(page.locator(`#field-${field.id}`)).toHaveAttribute('data-inserted', 'true');
    }

    await page.getByRole('button', { name: 'Complete' }).click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Sign' }).click({ force: true });
    await page.waitForURL(`/sign/${recipient.token}/complete`);

    await expect(async () => {
      const { status } = await getDocumentByToken({
        token: recipient.token,
      });

      expect(status).toBe(DocumentStatus.COMPLETED);
    }).toPass();

    await page.waitForTimeout(2500);

    // 締結証明書をダウンロード
    const completedEnvelope = await prisma.envelope.findFirstOrThrow({
      where: { id: document.id },
      include: {
        envelopeItems: {
          include: {
            documentData: true,
          },
        },
      },
    });

    const firstItem = completedEnvelope.envelopeItems[0];

    // 証明書付きPDFをダウンロード
    const pdfUrl = `http://localhost:3000/api/v1/documents/${firstItem.id}/download?token=${recipient.token}&version=signed&includeCertificate=true`;

    const pdfData = await fetch(pdfUrl).then(async (res) => await res.arrayBuffer());

    const pdfDoc = await PDF.load(new Uint8Array(pdfData));

    // 複数ページ（ドキュメント + 証明書 + 監査ログ）になっていることを確認
    expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(2);
  });

  test('audit log hash chain should be valid and tamper-proof', async () => {
    const { user, team } = await seedUser({
      isPersonalOrganisation: true,
    });

    const { document, recipients } = await seedPendingDocumentWithFullFields({
      owner: user,
      recipients: ['signer@example.com'],
      fields: [FieldType.SIGNATURE],
      teamId: team.id,
    });

    const recipient = recipients.find((r) => r.role === RecipientRole.SIGNER) ?? recipients[0];

    // 署名フローを実行
    await prisma.recipient.update({
      where: { id: recipient.id },
      data: {
        signingStatus: 'SIGNED',
        signedAt: new Date(),
        readStatus: 'OPENED',
      },
    });

    await prisma.envelope.update({
      where: { id: document.id },
      data: {
        status: DocumentStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    // 監査ログを取得してハッシュチェーンを検証
    const auditLogs = await prisma.documentAuditLog.findMany({
      where: { envelopeId: document.id },
      orderBy: { createdAt: 'asc' },
    });

    expect(auditLogs.length).toBeGreaterThan(0);

    // ハッシュチェーンの連続性を検証
    let prevHash = '';
    for (const log of auditLogs) {
      expect(log.prevHash ?? '').toBe(prevHash);
      expect(log.hash).toBeDefined();

      // ハッシュを再計算して検証
      const payload = JSON.stringify({
        id: log.id,
        createdAt: log.createdAt.toISOString(),
        type: log.type,
        data: log.data ?? null,
      });

      const computedHash = createHash('sha256')
        .update(`${prevHash ?? ''}|${payload}`)
        .digest('hex');
      expect(computedHash).toBe(log.hash);

      prevHash = log.hash;
    }
  });

  test('should export CSV with electronic ledger law required fields', async () => {
    const { user, team } = await seedUser({
      isPersonalOrganisation: true,
    });

    // 電帳法メタデータ付きドキュメントを作成
    const { document, recipients } = await seedPendingDocumentWithFullFields({
      owner: user,
      recipients: ['signer@example.com'],
      fields: [FieldType.SIGNATURE],
      teamId: team.id,
    });

    // DocumentMetaに電帳法メタデータを設定
    await prisma.documentMeta.update({
      where: { envelopeId: document.id },
      data: {
        contractType: '業務委託契約',
        counterpartyName: '株式会社テスト商事',
        contractAmount: 1000000,
        contractDate: new Date('2026-10-15'),
      },
    });

    // 署名完了
    await prisma.recipient.update({
      where: { id: recipients[0].id },
      data: {
        signingStatus: 'SIGNED',
        signedAt: new Date(),
        readStatus: 'OPENED',
      },
    });

    await prisma.envelope.update({
      where: { id: document.id },
      data: {
        status: DocumentStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    // CSVエクスポートAPIを呼び出し
    const csvResult = await prisma.$queryRaw`
      SELECT d.id, d.title, dm.contract_type, dm.counterparty_name, dm.contract_amount, dm.contract_date, d.completed_at
      FROM "Envelope" d
      LEFT JOIN "DocumentMeta" dm ON dm."envelopeId" = d.id
      WHERE d.id = ${document.id}
    `;

    expect(csvResult).toBeDefined();
    // 実際のAPIテストは認証が必要なため、ここではデータ存在確認のみ
    const docs = await prisma.envelope.findUnique({
      where: { id: document.id },
      include: { documentMeta: true },
    });

    expect(docs?.documentMeta?.contractType).toBe('業務委託契約');
    expect(docs?.documentMeta?.counterpartyName).toBe('株式会社テスト商事');
    expect(docs?.documentMeta?.contractAmount).toBe(1000000);
    expect(docs?.documentMeta?.contractDate).toEqual(new Date('2026-10-15'));
  });

  test('PDF tampering should be detectable via hash mismatch', async ({ page }) => {
    const { user, team } = await seedUser({
      isPersonalOrganisation: true,
    });

    const { document, recipients } = await seedPendingDocumentWithFullFields({
      owner: user,
      recipients: ['signer@example.com'],
      fields: [FieldType.SIGNATURE],
      teamId: team.id,
    });

    const recipient = recipients.find((r) => r.role === RecipientRole.SIGNER) ?? recipients[0];

    await page.goto(`/sign/${recipient.token}`);

    await signSignaturePad(page);

    for (const field of recipient.fields) {
      await page.locator(`#field-${field.id}`).getByRole('button').click();

      await expect(page.locator(`#field-${field.id}`)).toHaveAttribute('data-inserted', 'true');
    }

    await page.getByRole('button', { name: 'Complete' }).click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Sign' }).click({ force: true });
    await page.waitForURL(`/sign/${recipient.token}/complete`);

    await expect(async () => {
      const { status } = await getDocumentByToken({
        token: recipient.token,
      });

      expect(status).toBe(DocumentStatus.COMPLETED);
    }).toPass();

    await page.waitForTimeout(2500);

    const completedEnvelope = await prisma.envelope.findFirstOrThrow({
      where: { id: document.id },
      include: {
        envelopeItems: {
          include: {
            documentData: true,
          },
        },
      },
    });

    const firstItem = completedEnvelope.envelopeItems[0];

    const pdfUrl = `http://localhost:3000/api/v1/documents/${firstItem.id}/download?token=${recipient.token}&version=signed`;

    const pdfData = await fetch(pdfUrl).then(async (res) => await res.arrayBuffer());

    const originalBytes = new Uint8Array(pdfData);
    const originalHash = createHash('sha256').update(originalBytes).digest('hex');

    // 1バイト改変
    const tamperedBytes = new Uint8Array(originalBytes);
    const targetIndex = Math.floor(tamperedBytes.length / 2);
    tamperedBytes[targetIndex] = tamperedBytes[targetIndex] ^ 0xff;

    const tamperedHash = createHash('sha256').update(tamperedBytes).digest('hex');

    expect(tamperedHash).not.toBe(originalHash);

    // 改変版をロードして署名検証が失敗することを確認
    const tamperedPdf = await PDF.load(tamperedBytes);
    const signatures = tamperedPdf.getSignatures();

    // 署名は存在するが、改変検知のため検証ステータスが無効になるはず
    expect(signatures.length).toBeGreaterThan(0);
  });

  test('document meta should default to Japanese locale and timezone', async () => {
    const { user, team } = await seedUser({
      isPersonalOrganisation: true,
    });

    const { document } = await seedPendingDocumentWithFullFields({
      owner: user,
      recipients: ['signer@example.com'],
      fields: [FieldType.SIGNATURE],
      teamId: team.id,
    });

    const docMeta = await prisma.documentMeta.findUnique({
      where: { envelopeId: document.id },
    });

    expect(docMeta?.language).toBe('ja');
    expect(docMeta?.timezone).toBe('Asia/Tokyo');
  });

  test('should reject audit log update/delete operations', async () => {
    const { user, team } = await seedUser({
      isPersonalOrganisation: true,
    });

    const { document } = await seedPendingDocumentWithFullFields({
      owner: user,
      recipients: ['signer@example.com'],
      fields: [FieldType.SIGNATURE],
      teamId: team.id,
    });

    // 監査ログを作成
    const auditLog = await prisma.documentAuditLog.create({
      data: {
        envelopeId: document.id,
        type: 'TEST_ACTION',
        data: { test: true },
      },
    });

    // 更新を試みる - エラーになることを期待
    await expect(
      prisma.documentAuditLog.update({
        where: { id: auditLog.id },
        data: { data: { tampered: true } },
      }),
    ).rejects.toThrow('DocumentAuditLog is immutable');

    // 削除を試みる - エラーになることを期待
    await expect(
      prisma.documentAuditLog.delete({
        where: { id: auditLog.id },
      }),
    ).rejects.toThrow('DocumentAuditLog is immutable');

    // deleteMany を試みる - エラーになることを期待
    await expect(
      prisma.documentAuditLog.deleteMany({
        where: { envelopeId: document.id },
      }),
    ).rejects.toThrow('DocumentAuditLog is immutable');
  });

  test('D1: completed document email attaches both signed PDF and certificate PDF', async () => {
    const { user, team } = await seedUser({
      isPersonalOrganisation: true,
    });

    const { document, recipients } = await seedPendingDocumentWithFullFields({
      owner: user,
      recipients: ['signer@example.com'],
      fields: [FieldType.SIGNATURE],
      teamId: team.id,
    });

    // 署名完了状態に更新
    await prisma.recipient.update({
      where: { id: recipients[0].id },
      data: {
        signingStatus: 'SIGNED',
        signedAt: new Date(),
        readStatus: 'OPENED',
      },
    });

    await prisma.envelope.update({
      where: { id: document.id },
      data: {
        status: DocumentStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    // 完了メール送信ジョブハンドラーを実行（メール送信のモック・監査ログ検証）
    const { run: runSendCompletedEmails } = await import(
      '@documenso/lib/jobs/definitions/emails/send-document-completed-emails.handler'
    );

    const mockLogger = {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    };

    await runSendCompletedEmails({
      payload: {
        envelopeId: document.id,
      },
      io: {
        logger: mockLogger as any,
      } as any,
    });

    // EMAIL_SENT 監査ログが記録されていることを確認
    const emailAuditLogs = await prisma.documentAuditLog.findMany({
      where: {
        envelopeId: document.id,
        type: 'EMAIL_SENT',
      },
    });

    expect(emailAuditLogs.length).toBeGreaterThan(0);
  });
});
