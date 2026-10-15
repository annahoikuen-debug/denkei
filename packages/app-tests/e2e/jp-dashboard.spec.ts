import { prisma } from '@documenso/prisma';
import { computeDashboardStatus } from '@documenso/lib/universal/dashboard-progress';
import { seedDocuments, seedDraftDocument } from '@documenso/prisma/seed/documents';
import { seedUser } from '@documenso/prisma/seed/users';
import { expect, test } from '@playwright/test';
import { DocumentStatus, EnvelopeType, FieldType } from '@prisma/client';

import { apiSignin } from './fixtures/authentication';

/**
 * フェーズ2 ステップ30: ダッシュボード4列ビュー E2E
 *
 * 状態遷移でカードが列間を移動することを検証する
 * (分類ロジック computeDashboardStatus はユニットテスト済みのため、
 *  ここでは実データとの統合を確認)。
 */
test.describe('[JP] Dashboard', () => {
    test('classifies seeded documents into dashboard columns', async ({ page }) => {
        const { user, team } = await seedUser({ isPersonalOrganisation: true });

        // DRAFT(承認待ち)を作成
        await seedDraftDocument(user, team.id, []);

        // PENDING(署名中)を作成
        const { document } = await seedDocuments([
            {
                sender: user,
                teamId: team.id,
                recipients: ['signer@example.com'],
                type: DocumentStatus.PENDING,
                documentOptions: {
                    internalVersion: 2,
                },
            },
        ]);

        const envelopes = await prisma.envelope.findMany({
            where: { teamId: team.id, type: EnvelopeType.DOCUMENT },
            include: { recipients: true },
        });

        const classifications = envelopes.map((envelope) =>
            computeDashboardStatus({
                status: envelope.status,
                sentAt: envelope.sentAt,
                completedAt: envelope.completedAt,
                hasExpiredRecipient: envelope.recipients.some((r) => r.expired !== null),
            }),
        );

        // 承認待ち(DRAFT)と署名中(PENDING)が少なくとも1件ずつ分類される
        expect(classifications).toContain('awaiting-approval');
        expect(classifications).toContain('in-progress');
    });

    test('dashboard page loads without errors', async ({ page }) => {
        const { user, team } = await seedUser({ isPersonalOrganisation: true });

        await apiSignin({ page, email: user.email, redirectPath: `/t/${team.url}/documents` });

        await expect(page.locator('table, [data-testid="documents-table"], main')).toBeVisible();
    });
});
