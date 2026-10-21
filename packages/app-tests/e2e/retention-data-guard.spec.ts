import { prisma } from '@documenso/prisma';
import { seedCompletedDocument } from '@documenso/prisma/seed/documents';
import { seedUser } from '@documenso/prisma/seed/users';
import { expect, test } from '@playwright/test';

/**
 * R-02: 完了文書の保管期限ジョブ(R-01)によって PDF 実体が破棄された場合の縮退動作を検証する。
 *
 * E2E ではジョブを直接トリガーできないため、`DocumentData.data / initialData` を
 * 空文字化(purge-envelope-data.ts と同じ哨兵値)して破棄済み状態を再現し、
 * 以下を検証する:
 *
 * 1. 破棄済み文書のファイル取得は 410 + 日本語メッセージ(AppError DOCUMENT_DATA_PURGED)
 * 2. 破棄済み文書のダウンロードも同様に 410
 * 3. 期限切れでない通常の完了文書は引き続き PDF を取得できる(正の対照)
 *
 * 前提: E2E 環境は `.env` の `NEXT_PRIVATE_ENVELOPE_RETENTION_DAYS=0`(既定・無効)で起動する。
 */
test.describe('[JP] Retention Data Guard', () => {
  test('should return 410 with Japanese message for a purged document and keep normal documents intact', async ({
    request,
  }) => {
    const { user, team } = await seedUser({
      isPersonalOrganisation: true,
    });

    // --- 正常な完了文書(対照群) ---
    const normalDocument = await seedCompletedDocument(user, team.id, ['signer@example.com']);

    // --- 破棄済み文書(保管期限ジョブ実行後の状態を再現) ---
    const purgedDocument = await seedCompletedDocument(user, team.id, ['purged@example.com']);

    const purgedEnvelopeItem = purgedDocument.envelopeItems[0];

    await prisma.documentData.update({
      where: { id: purgedEnvelopeItem.documentDataId },
      data: { data: '', initialData: '' },
    });

    const purgedRecipient = await prisma.recipient.findFirstOrThrow({
      where: { envelopeId: purgedDocument.id },
    });

    const normalRecipient = await prisma.recipient.findFirstOrThrow({
      where: { envelopeId: normalDocument.id },
    });

    const normalEnvelopeItem = normalDocument.envelopeItems[0];

    // --- 1. 破棄済み文書の表示(PDF取得)は 410 + 日本語メッセージ ---
    const purgedViewResponse = await request.get(
      `/api/files/token/${purgedRecipient.token}/envelopeItem/${purgedEnvelopeItem.id}`,
    );

    expect(purgedViewResponse.status()).toBe(410);

    const purgedViewBody = (await purgedViewResponse.json()) as { error?: string; code?: string };
    expect(purgedViewBody.code).toBe('DOCUMENT_DATA_PURGED');
    expect(purgedViewBody.error).toContain('保管期限を過ぎたため');
    expect(purgedViewBody.error).toContain('監査');

    // --- 2. 破棄済み文書のダウンロードも 410 ---
    const purgedDownloadResponse = await request.get(
      `/api/files/token/${purgedRecipient.token}/envelopeItem/${purgedEnvelopeItem.id}/download/signed`,
    );

    expect(purgedDownloadResponse.status()).toBe(410);

    const purgedDownloadBody = (await purgedDownloadResponse.json()) as { code?: string };
    expect(purgedDownloadBody.code).toBe('DOCUMENT_DATA_PURGED');

    // --- 3. 期限内の通常文書は影響を受けない(正の対照) ---
    const normalViewResponse = await request.get(
      `/api/files/token/${normalRecipient.token}/envelopeItem/${normalEnvelopeItem.id}`,
    );

    expect(normalViewResponse.status()).toBe(200);
    expect(normalViewResponse.headers()['content-type']).toBe('application/pdf');
  });
});
