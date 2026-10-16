import { getDocumentByToken } from '@documenso/lib/server-only/document/get-document-by-token';
import { prisma } from '@documenso/prisma';
import { seedPendingDocumentWithFullFields } from '@documenso/prisma/seed/documents';
import { seedUser } from '@documenso/prisma/seed/users';
import { expect, test } from '@playwright/test';
import { DocumentStatus, FieldType, RecipientRole } from '@prisma/client';

/**
 * フェーズ1 Stage D: モバイル手書き署名 E2E(ステップ26)
 *
 * タッチデバイスエミュレーション(iPhone ビューポート)で
 * 「手書き描画→確定→完了」の一連を検証する。
 */
test.describe('[JP] Mobile Signing', () => {
  test.use({
    viewport: { width: 390, height: 844 }, // iPhone 14 相当
    hasTouch: true,
    isMobile: true,
  });

  test('should draw a signature with touch and complete the document', async ({ page }) => {
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

    // 署名パッドダイアログを開く
    await page.waitForTimeout(200);
    await page.getByTestId('signature-pad-dialog-button').click();

    // 手書き(Draw)タブでタッチ描画
    await page.getByRole('tab', { name: /Draw|描画|手書き/ }).click();

    const canvas = page.getByTestId('signature-pad-draw');

    const box = await canvas.boundingBox();

    expect(box).not.toBeNull();

    if (box) {
      // タッチでサインカーブを描く
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);

      // 実際に線を描くため pointer イベントをエミュレート
      const points = [
        [0.2, 0.5],
        [0.3, 0.3],
        [0.4, 0.6],
        [0.5, 0.35],
        [0.6, 0.55],
        [0.8, 0.5],
      ];

      await canvas.dispatchEvent('pointerdown', {
        pointerId: 1,
        pointerType: 'touch',
        isPrimary: true,
        clientX: box.x + box.width * 0.2,
        clientY: box.y + box.height * 0.5,
        buttons: 1,
      });

      for (const [xRatio, yRatio] of points) {
        await canvas.dispatchEvent('pointermove', {
          pointerId: 1,
          pointerType: 'touch',
          isPrimary: true,
          clientX: box.x + box.width * xRatio,
          clientY: box.y + box.height * yRatio,
          buttons: 1,
        });
      }

      await canvas.dispatchEvent('pointerup', {
        pointerId: 1,
        pointerType: 'touch',
        isPrimary: true,
        clientX: box.x + box.width * 0.8,
        clientY: box.y + box.height * 0.5,
      });
    }

    // 確定(Next)
    await page.getByRole('button', { name: /Next|次へ/ }).click();

    for (const field of recipient.fields) {
      await page.locator(`#field-${field.id}`).getByRole('button').click();

      await expect(page.locator(`#field-${field.id}`)).toHaveAttribute('data-inserted', 'true');
    }

    await page.getByRole('button', { name: /Complete|完了/ }).click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: /Sign|署名/ }).click({ force: true });
    await page.waitForURL(`/sign/${recipient.token}/complete`);

    await expect(async () => {
      const { status } = await getDocumentByToken({ token: recipient.token });

      expect(status).toBe(DocumentStatus.COMPLETED);
    }).toPass();

    // 完了後に DB へ署名が保存されていること
    const signature = await prisma.signature.findFirstOrThrow({
      where: { recipientId: recipient.id },
    });

    expect(signature.signatureImageAsBase64).toBeTruthy();
  });
});
