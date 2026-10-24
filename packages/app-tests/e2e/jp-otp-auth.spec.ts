import { hashOtp } from '@documenso/lib/server-only/otp/otp';
import { DocumentAuth } from '@documenso/lib/types/document-auth';
import { prisma } from '@documenso/prisma';
import { seedPendingDocumentWithFullFields } from '@documenso/prisma/seed/documents';
import { seedUser } from '@documenso/prisma/seed/users';
import { expect, test } from '@playwright/test';
import { DocumentStatus, FieldType, RecipientRole } from '@prisma/client';

/**
 * フェーズ2 ステップ9: OTP 認証 E2E(統合)
 *
 * - OTP ゲートの表示と通過
 * - 誤入力でエラー・残試行表示
 * - 上限でロック
 * - OTP 未設定の従来フロー(後方互換)が壊れないこと
 */
test.describe('[JP] OTP Auth', () => {
  test('legacy flow without OTP still works (backward compatibility)', async ({ page }) => {
    const { user, team } = await seedUser({ isPersonalOrganisation: true });

    const { recipients } = await seedPendingDocumentWithFullFields({
      owner: user,
      recipients: ['signer@example.com'],
      fields: [FieldType.SIGNATURE],
      teamId: team.id,
    });

    const recipient = recipients.find((r) => r.role === RecipientRole.SIGNER) ?? recipients[0];

    // OTP ゲートが表示されず直接署名画面に入れること
    await page.goto(`/sign/${recipient.token}`);

    await expect(page.getByTestId('signature-pad-dialog-button')).toBeVisible({ timeout: 10_000 });
  });

  test('otp gate: correct code passes to signing screen', async ({ page }) => {
    const { user, team } = await seedUser({ isPersonalOrganisation: true });

    const { document, recipients } = await seedPendingDocumentWithFullFields({
      owner: user,
      recipients: ['signer@example.com'],
      fields: [FieldType.SIGNATURE],
      teamId: team.id,
    });

    const recipient = recipients.find((r) => r.role === RecipientRole.SIGNER) ?? recipients[0];

    // テスト用に OTP トークンを直接作成(hash は既知の '123456')
    await prisma.recipientVerificationToken.create({
      data: {
        recipientId: recipient.id,
        authType: DocumentAuth.EMAIL_OTP,
        tokenHash: hashOtp('123456'),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    // 宛先の認証設定に EMAIL_OTP を付与
    await prisma.recipient.update({
      where: { id: recipient.id },
      data: {
        authOptions: {
          accessAuth: [DocumentAuth.EMAIL_OTP],
          actionAuth: [],
        },
      },
    });

    await page.goto(`/sign/${recipient.token}`);

    // OTP ゲートが表示される
    const gate = page.getByTestId('otp-gate');

    await expect(gate).toBeVisible({ timeout: 30_000 });

    // 注意: fill は hydration 完了前に実行されると React の onChange が発火しないため、
    // 実際のキー入力(click + pressSequentially)で入力する。
    const otpInput = page.getByTestId('otp-input');
    await otpInput.click();
    await otpInput.pressSequentially('123456', { delay: 30 });

    await page.getByRole('button', { name: '確認する' }).click();

    // 検証成功で署名画面へ進む
    await expect(page.getByTestId('signature-pad-dialog-button')).toBeVisible({ timeout: 15_000 });

    // ドキュメントが完了していないことを確認
    const envelope = await prisma.envelope.findFirstOrThrow({ where: { id: document.id } });
    expect(envelope.status).toBe('PENDING');
  });

  test('otp gate: wrong code shows error and remaining attempts', async ({ page }) => {
    const { user, team } = await seedUser({ isPersonalOrganisation: true });

    const { recipients } = await seedPendingDocumentWithFullFields({
      owner: user,
      recipients: ['signer@example.com'],
      fields: [FieldType.SIGNATURE],
      teamId: team.id,
    });

    const recipient = recipients.find((r) => r.role === RecipientRole.SIGNER) ?? recipients[0];

    await prisma.recipientVerificationToken.create({
      data: {
        recipientId: recipient.id,
        authType: DocumentAuth.EMAIL_OTP,
        tokenHash: hashOtp('123456'),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await prisma.recipient.update({
      where: { id: recipient.id },
      data: {
        authOptions: {
          accessAuth: [DocumentAuth.EMAIL_OTP],
          actionAuth: [],
        },
      },
    });

    await page.goto(`/sign/${recipient.token}`);

    const gate = page.getByTestId('otp-gate');

    await expect(gate).toBeVisible({ timeout: 30_000 });

    // fill は hydration 完了前に実行されると onChange が発火しないため、実際のキー入力を使う
    const otpInput = page.getByTestId('otp-input');
    await otpInput.click();
    await otpInput.pressSequentially('000000', { delay: 30 });

    await page.getByRole('button', { name: '確認する' }).click();

    await expect(page.getByTestId('otp-error')).toBeVisible();
    await expect(page.getByTestId('otp-remaining-attempts')).toContainText('残り試行回数: 4 / 5');
  });

  test('otp gate: locks after max attempts', async ({ page }) => {
    const { user, team } = await seedUser({ isPersonalOrganisation: true });

    const { recipients } = await seedPendingDocumentWithFullFields({
      owner: user,
      recipients: ['signer@example.com'],
      fields: [FieldType.SIGNATURE],
      teamId: team.id,
    });

    const recipient = recipients.find((r) => r.role === RecipientRole.SIGNER) ?? recipients[0];

    await prisma.recipientVerificationToken.create({
      data: {
        recipientId: recipient.id,
        authType: DocumentAuth.EMAIL_OTP,
        tokenHash: hashOtp('123456'),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await prisma.recipient.update({
      where: { id: recipient.id },
      data: {
        authOptions: {
          accessAuth: [DocumentAuth.EMAIL_OTP],
          actionAuth: [],
        },
      },
    });

    await page.goto(`/sign/${recipient.token}`);

    const gate = page.getByTestId('otp-gate');

    await expect(gate).toBeVisible({ timeout: 30_000 });

    // fill は hydration 完了前に実行されると onChange が発火しないため、実際のキー入力を使う
    const otpInput = page.getByTestId('otp-input');
    await otpInput.click();
    await otpInput.pressSequentially('000000', { delay: 30 });

    // 5回誤入力してロックさせる(各回、サーバー応答で残試行が減ることを待つ)
    // 入力値は OTP ステートに保持されるため、2回目以降はそのまま送信する。
    for (let i = 0; i < 5; i++) {
      await page.getByRole('button', { name: '確認する' }).click();

      if (i < 4) {
        await expect(page.getByTestId('otp-remaining-attempts')).toContainText(`残り試行回数: ${4 - i} / 5`);
      }
    }

    await expect(page.getByTestId('otp-locked')).toBeVisible();

    // ロック後は署名画面に入れない
    await expect(page.getByTestId('signature-pad-dialog-button')).toBeHidden();

    // ドキュメントが完了していないこと
    const envelope = await prisma.envelope.findFirstOrThrow({
      where: { recipients: { some: { id: recipient.id } } },
    });

    expect(envelope.status).toBe(DocumentStatus.PENDING);
  });
});
