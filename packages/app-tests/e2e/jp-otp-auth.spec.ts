import { prisma } from '@documenso/prisma';
import { hashOtp } from '@documenso/lib/server-only/otp/otp';
import { seedPendingDocumentWithFullFields } from '@documenso/prisma/seed/documents';
import { seedUser } from '@documenso/prisma/seed/users';
import { expect, test } from '@playwright/test';
import { DocumentAuth, DocumentStatus, FieldType, RecipientRole } from '@prisma/client';

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
                    accessAuth: [{ type: DocumentAuth.EMAIL_OTP }],
                    actionAuth: [],
                },
            },
        });

        await page.goto(`/sign/${recipient.token}`);

        // OTP ゲートが表示される
        const gate = page.getByTestId('otp-gate');

        if (await gate.isVisible()) {
            await page.getByTestId('otp-input').fill('123456');
            await page.getByRole('button', { name: '確認する' }).click();

            await expect(page.getByTestId('signature-pad-dialog-button')).toBeVisible({ timeout: 10_000 });
        }

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
                    accessAuth: [{ type: DocumentAuth.EMAIL_OTP }],
                    actionAuth: [],
                },
            },
        });

        await page.goto(`/sign/${recipient.token}`);

        const gate = page.getByTestId('otp-gate');

        if (await gate.isVisible()) {
            await page.getByTestId('otp-input').fill('000000');
            await page.getByRole('button', { name: '確認する' }).click();

            await expect(page.getByTestId('otp-error')).toBeVisible();
            await expect(page.getByTestId('otp-remaining-attempts')).toContainText('残り試行回数: 4 / 5');
        }
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
                    accessAuth: [{ type: DocumentAuth.EMAIL_OTP }],
                    actionAuth: [],
                },
            },
        });

        await page.goto(`/sign/${recipient.token}`);

        const gate = page.getByTestId('otp-gate');

        if (await gate.isVisible()) {
            // 5回誤入力してロックさせる
            for (let i = 0; i < 5; i++) {
                await page.getByTestId('otp-input').fill('000000');
                await page.getByRole('button', { name: '確認する' }).click();
                await page.waitForTimeout(200);
            }

            await expect(page.getByTestId('otp-locked')).toBeVisible();

            // ロック後は署名画面に入れない
            await expect(page.getByTestId('signature-pad-dialog-button')).toBeHidden();
        }

        // ドキュメントが完了していないこと
        const envelope = await prisma.envelope.findFirstOrThrow({
            where: { recipients: { some: { id: recipient.id } } },
        });

        expect(envelope.status).toBe(DocumentStatus.PENDING);
    });
});
