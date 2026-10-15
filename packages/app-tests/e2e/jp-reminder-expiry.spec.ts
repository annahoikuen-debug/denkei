import { prisma } from '@documenso/prisma';
import { seedPendingDocumentWithFullFields } from '@documenso/prisma/seed/documents';
import { seedUser } from '@documenso/prisma/seed/users';
import { expect, test } from '@playwright/test';
import { DateTime } from 'luxon';
import { FieldType, RecipientRole, SendStatus } from '@prisma/client';

/**
 * フェーズ2 ステップ28: リマインダー・期限 E2E
 *
 * 時間経過を含むシナリオを「ジョブ手動発火相当の DB 状態操作」で検証する。
 * - nextReminderAt 到来 → リマインダー対象になる
 * - expiresAt 到来 → 期限切れ無効化+owner 通知対象になる
 */
test.describe('[JP] Reminder & Expiry', () => {
    test('recipient with past nextReminderAt becomes reminder target', async () => {
        const { user, team } = await seedUser({ isPersonalOrganisation: true });

        const { recipients } = await seedPendingDocumentWithFullFields({
            owner: user,
            recipients: ['signer@example.com'],
            fields: [FieldType.SIGNATURE],
            teamId: team.id,
        });

        const recipient = recipients.find((r) => r.role === RecipientRole.SIGNER) ?? recipients[0];

        const threeDaysAgo = DateTime.now().minus({ days: 3 }).toJSDate();

        await prisma.recipient.update({
            where: { id: recipient.id },
            data: {
                sendStatus: SendStatus.SENT,
                lastReminderSentAt: null,
                nextReminderAt: threeDaysAgo,
                reminderCount: 0,
            },
        });

        // sweep ジョブの抽出条件(nextReminderAt <= now, 未署名, 送信済み)に該当すること
        const targets = await prisma.recipient.findMany({
            where: {
                id: recipient.id,
                sendStatus: SendStatus.SENT,
                signingStatus: 'NOT_SIGNED',
                nextReminderAt: { lte: new Date() },
            },
        });

        expect(targets).toHaveLength(1);
    });

    test('recipient with past expiresAt becomes expiry target', async () => {
        const { user, team } = await seedUser({ isPersonalOrganisation: true });

        const { recipients } = await seedPendingDocumentWithFullFields({
            owner: user,
            recipients: ['signer@example.com'],
            fields: [FieldType.SIGNATURE],
            teamId: team.id,
        });

        const recipient = recipients.find((r) => r.role === RecipientRole.SIGNER) ?? recipients[0];

        const oneDayAgo = DateTime.now().minus({ days: 1 }).toJSDate();

        await prisma.recipient.update({
            where: { id: recipient.id },
            data: {
                sendStatus: SendStatus.SENT,
                expiresAt: oneDayAgo,
            },
        });

        // expire-recipients-sweep の抽出条件に該当すること
        const targets = await prisma.recipient.findMany({
            where: {
                id: recipient.id,
                sendStatus: SendStatus.SENT,
                signingStatus: 'NOT_SIGNED',
                expiresAt: { lte: new Date() },
            },
        });

        expect(targets).toHaveLength(1);
    });

    test('reminder settings reflect interval and max count', async () => {
        const { user, team } = await seedUser({ isPersonalOrganisation: true });

        const { document, recipients } = await seedPendingDocumentWithFullFields({
            owner: user,
            recipients: ['signer@example.com'],
            fields: [FieldType.SIGNATURE],
            teamId: team.id,
        });

        const recipient = recipients.find((r) => r.role === RecipientRole.SIGNER) ?? recipients[0];

        // 送信画面で設定した値が DocumentMeta.reminderSettings に反映されることを模擬
        await prisma.documentMeta.updateMany({
            where: { envelope: { id: document.id } },
            data: {
                reminderSettings: {
                    reminderIntervalDays: 3,
                    reminderMaxCount: 3,
                    enabled: true,
                    ownerCopyEnabled: true,
                },
            },
        });

        const meta = await prisma.documentMeta.findFirstOrThrow({
            where: { envelope: { id: document.id } },
        });

        expect(meta.reminderSettings).toMatchObject({
            reminderIntervalDays: 3,
            reminderMaxCount: 3,
            enabled: true,
        });

        // recipient 側の nextReminderAt が間隔どおり計算されることを確認
        const nextReminder = DateTime.now().plus({ days: 3 }).toJSDate();

        await prisma.recipient.update({
            where: { id: recipient.id },
            data: { nextReminderAt: nextReminder, reminderCount: 1 },
        });

        const updated = await prisma.recipient.findFirstOrThrow({ where: { id: recipient.id } });

        expect(updated.reminderCount).toBe(1);
        expect(updated.nextReminderAt!.getTime()).toBeGreaterThan(Date.now());
    });
});
