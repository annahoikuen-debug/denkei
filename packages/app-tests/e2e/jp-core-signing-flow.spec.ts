import { getDocumentByToken } from '@documenso/lib/server-only/document/get-document-by-token';
import { getEnvelopeItemPdfUrl } from '@documenso/lib/utils/envelope-download';
import { prisma } from '@documenso/prisma';
import { seedPendingDocumentWithFullFields } from '@documenso/prisma/seed/documents';
import { seedUser } from '@documenso/prisma/seed/users';
import { PDF } from '@libpdf/core';
import { expect, test } from '@playwright/test';
import { DocumentStatus, FieldType, RecipientRole } from '@prisma/client';
import { DateTime } from 'luxon';
import { signSignaturePad } from './fixtures/signature';

/**
 * フェーズ1 コアフローリグレッション spec(ステップ2)
 *
 * 「送信(シード済みペンディングドキュメント)→メール受信相当(トークンURL直接訪問)→
 *   署名→完了→完了PDF検証」の一連フローを担保する。
 *
 * 以降のフェーズ1ステップ(日本語化・モバイル署名・タイムスタンプ等)では
 * この spec を壊さないことを原則とする。
 */
test.describe('[JP] Core Signing Flow', () => {
  test('should complete the core signing flow: sign → complete → completed PDF', async ({ page }) => {
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

    // --- 署名画面へアクセス(メール内リンク相当) ---
    await page.goto(`/sign/${recipient.token}`);

    // --- 署名を実施 ---
    await signSignaturePad(page);

    for (const field of recipient.fields) {
      await page.locator(`#field-${field.id}`).getByRole('button').click();

      await expect(page.locator(`#field-${field.id}`)).toHaveAttribute('data-inserted', 'true');
    }

    // --- 完了 ---
    await page.getByRole('button', { name: 'Complete' }).click();
    await page.waitForTimeout(1000);

    // 完了確認ダイアログのボタンは DocumentMeta.language に依存する(ja: 合意して電子認印を押印する / en: Sign)。
    await page.getByRole('button', { name: /Sign|合意して電子認印を押印する/ }).click({ force: true });
    await page.waitForURL(`/sign/${recipient.token}/complete`);

    // --- 完了ステータスの反映を待機 ---
    await expect(async () => {
      const { status } = await getDocumentByToken({
        token: recipient.token,
      });

      expect(status).toBe(DocumentStatus.COMPLETED);
    }).toPass();

    await page.waitForTimeout(2500);

    // --- 完了画面が表示されていること ---
    // 完了画面の文言は言語/宛先数により異なる(ja: 全員が署名しました / en: You have signed / Everyone has signed)。
    await expect(page.getByText(/You have signed|Everyone has signed|全員が署名/).first()).toBeVisible();
  });

  test('should display the inserted DATE field in Japanese date format (DocumentMeta timezone/language)', async ({
    page,
  }) => {
    const { user, team } = await seedUser({
      isPersonalOrganisation: true,
    });

    const { document, recipients } = await seedPendingDocumentWithFullFields({
      owner: user,
      recipients: ['signer@example.com'],
      fields: [FieldType.SIGNATURE, FieldType.DATE],
      teamId: team.id,
    });

    // ステップ3 のマイグレーション方針に合わせ、seed 後に ja / Asia/Tokyo を明示設定
    await prisma.documentMeta.updateMany({
      where: {
        envelope: { id: document.id },
      },
      data: {
        language: 'ja',
        timezone: 'Asia/Tokyo',
        dateFormat: 'yyyy年M月d日',
      },
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

    // 完了確認ダイアログのボタンは DocumentMeta.language に依存する(ja: 合意して電子認印を押印する / en: Sign)。
    await page.getByRole('button', { name: /Sign|合意して電子認印を押印する/ }).click({ force: true });
    await page.waitForURL(`/sign/${recipient.token}/complete`);

    // 完了後、DocumentMeta の timezone(Asia/Tokyo)と日本語 dateFormat で
    // DATE フィールドの customText が計算されていることを検証
    const dateField = recipient.fields.find((f) => f.type === FieldType.DATE);

    const expected = DateTime.now().setZone('Asia/Tokyo').toFormat('yyyy年M月d日');

    // customText が設定されており、期待される日本語日付フォーマットに合致していることを検証
    // シール(完了処理)は非同期ジョブのため、反映までリトライする。
    await expect(async () => {
      const insertedField = await prisma.field.findFirstOrThrow({
        where: { id: dateField?.id },
      });

      expect(insertedField.customText).toBe(expected);
    }).toPass({ timeout: 30_000 });

    // 完了ステータスを担保(シール完了の反映を待つ)
    await expect(async () => {
      const { status } = await getDocumentByToken({ token: recipient.token });
      expect(status).toBe(DocumentStatus.COMPLETED);
    }).toPass({ timeout: 30_000 });
  });

  test('should produce a valid completed PDF after signing', async ({ page }) => {
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

    // 完了確認ダイアログのボタンは DocumentMeta.language に依存する(ja: 合意して電子認印を押印する / en: Sign)。
    await page.getByRole('button', { name: /Sign|合意して電子認印を押印する/ }).click({ force: true });
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

    const pdfUrl = getEnvelopeItemPdfUrl({
      type: 'download',
      envelopeItem: firstItem,
      token: recipient.token,
      version: 'signed',
    });

    const pdfData = await fetch(pdfUrl).then(async (res) => await res.arrayBuffer());

    const pdfDoc = await PDF.load(new Uint8Array(pdfData));

    expect(pdfDoc.getPageCount()).toBeGreaterThan(0);
  });
});
