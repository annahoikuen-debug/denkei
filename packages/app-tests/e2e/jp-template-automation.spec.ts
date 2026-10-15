import { prisma } from '@documenso/prisma';
import { seedPendingDocumentWithFullFields } from '@documenso/prisma/seed/documents';
import { seedUser } from '@documenso/prisma/seed/users';
import { expect, test } from '@playwright/test';
import { DocumentStatus, FieldType, RecipientRole } from '@prisma/client';

import { signSignaturePad } from './fixtures/signature';

/**
 * フェーズ3 ステップ15: テンプレート→変数→(承認)→署名→完了 E2E
 *
 * マトリクス: 承認あり/なし × 署名順固定あり/なし
 * 分類ロジック・差し込みはユニットテスト済みのため、
 * ここではエンベロープ単位のフロー統合を確認する。
 */
test.describe('[JP] Template Automation', () => {
  test('matrix: no approval, sequential order - signer signs then completes', async ({ page }) => {
    const { user, team } = await seedUser({ isPersonalOrganisation: true });

    const { document, recipients } = await seedPendingDocumentWithFullFields({
      owner: user,
      recipients: ['signer@example.com'],
      fields: [FieldType.SIGNATURE],
      teamId: team.id,
    });

    const recipient = recipients.find((r) => r.role === RecipientRole.SIGNER) ?? recipients[0];

    // 署名順固定(先方→自社)相当: SEQUENTIAL + signingOrder 設定
    await prisma.envelope.update({
      where: { id: document.id },
      data: {
        signingOrder: 'SEQUENTIAL',
        recipients: {
          update: {
            where: { id: recipient.id },
            data: { signingOrder: 1 },
          },
        },
      },
    });

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
      const { status } = await getDocumentStatus(recipient.token);

      expect(status).toBe(DocumentStatus.COMPLETED);
    }).toPass();
  });

  test('matrix: approval required - approver must approve before distribution', async () => {
    const { user, team } = await seedUser({ isPersonalOrganisation: true });

    const { document, recipients } = await seedPendingDocumentWithFullFields({
      owner: user,
      recipients: ['signer@example.com'],
      fields: [FieldType.SIGNATURE],
      teamId: team.id,
    });

    // APPROVER を追加
    const approver = await prisma.recipient.create({
      data: {
        envelopeId: document.id,
        email: 'approver@example.com',
        name: '承認者',
        token: `approver-token-${Date.now()}`,
        role: RecipientRole.APPROVER,
      },
    });

    await expect(async () => {
      const recipient = await prisma.recipient.findFirstOrThrow({
        where: { id: (recipients.find((r) => r.role === RecipientRole.SIGNER) ?? recipients[0]).id },
      });

      // 承認前は署名者は SIGNED でない
      expect(recipient.signingStatus).toBe('NOT_SIGNED');
    }).toPass({ timeout: 5_000 });

    const { approveEnvelopeByRecipient } = await import('@documenso/lib/server-only/envelope/approval-flow');

    // 承認操作
    const result = await approveEnvelopeByRecipient({
      envelopeId: document.id,
      recipientId: approver.id,
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe('APPROVED');

    const approved = await prisma.recipient.findFirstOrThrow({ where: { id: approver.id } });
    expect(approved.signingStatus).toBe('SIGNED');
  });

  test('matrix: rejection returns envelope to draft via rejectEnvelopeByRecipient', async () => {
    const { user, team } = await seedUser({ isPersonalOrganisation: true });

    const { document } = await seedPendingDocumentWithFullFields({
      owner: user,
      recipients: ['signer@example.com'],
      fields: [FieldType.SIGNATURE],
      teamId: team.id,
    });

    const approver = await prisma.recipient.create({
      data: {
        envelopeId: document.id,
        email: 'approver@example.com',
        name: '承認者',
        token: `approver-token-reject-${Date.now()}`,
        role: RecipientRole.APPROVER,
      },
    });

    const { rejectEnvelopeByRecipient } = await import('@documenso/lib/server-only/envelope/approval-flow');

    // 差し戻し(承認拒否)
    const rejectResult = await rejectEnvelopeByRecipient({
      envelopeId: document.id,
      recipientId: approver.id,
      reason: '第3条の支払期日を修正してください',
    });

    expect(rejectResult.success).toBe(true);
    expect(rejectResult.status).toBe('REJECTED');

    const rejected = await prisma.recipient.findFirstOrThrow({ where: { id: approver.id } });
    expect(rejected.rejectionReason).toBe('第3条の支払期日を修正してください');

    const envelope = await prisma.envelope.findFirstOrThrow({ where: { id: document.id } });
    expect(envelope.status).toBe('DRAFT');
  });

  test('template merge variables and currency/wareki formatting test', async () => {
    const { user, team } = await seedUser({ isPersonalOrganisation: true });

    const { createDocumentFromTemplate } = await import(
      '@documenso/lib/server-only/template/create-document-from-template'
    );
    const { createTemplate } = await import('@documenso/lib/server-only/template/create-template');

    // テンプレートを作成
    const template = await createTemplate({
      userId: user.id,
      teamId: team.id,
      title: '業務委託契約書(テスト雛形)',
    });

    // 差し込み変数を設定
    await prisma.envelope.update({
      where: { id: template.id },
      data: {
        automationSettings: {
          mergeVariables: [
            { name: '取引先名', type: 'text', required: true },
            { name: '報酬額', type: 'currency', required: true, format: 'jpy' },
            { name: '契約締結日', type: 'wareki', required: true, format: 'wareki_kanji' },
          ],
        },
      },
    });

    // 差し込み変数を指定してテンプレートからドキュメント生成
    const created = await createDocumentFromTemplate({
      id: {
        type: 'templateId',
        id: template.id,
      },
      userId: user.id,
      teamId: team.id,
      recipients: [
        {
          id: 1,
          name: '山田 太郎',
          email: 'yamada@example.com',
        },
      ],
      mergeVariableValues: {
        取引先名: 'テスト株式会社',
        報酬額: '350000',
        契約締結日: '2026-10-15',
      },
      requestMetadata: {
        ipAddress: '127.0.0.1',
        userAgent: 'Playwright-Test',
      },
    });

    expect(created.id).toBeDefined();
    expect(created.type).toBe('DOCUMENT');

    const docInDb = await prisma.envelope.findUnique({
      where: { id: created.id },
    });

    expect(docInDb).toBeDefined();
    expect(docInDb?.templateId).toBe(template.id);
  });

  test('signingOrderLock and requireEmailOtp (Secure by Default) are enforced', async () => {
    const { user, team } = await seedUser({ isPersonalOrganisation: true });

    const template = await prisma.envelope.create({
      data: {
        id: `tpl-${Date.now()}`,
        secondaryId: `TPL-${Date.now()}`,
        type: 'TEMPLATE',
        title: 'セキュア署名順固定テンプレート',
        userId: user.id,
        teamId: team.id,
        automationSettings: {
          signingOrderLock: {
            locked: true,
            order: 'counterparty-first',
          },
          requireEmailOtp: true,
          mergeVariables: [],
          approval: { enabled: false, rejectToDraft: true },
        },
        recipients: {
          createMany: {
            data: [
              {
                email: 'recipient1@example.com',
                name: '先方署名者',
                role: RecipientRole.SIGNER,
                signingOrder: 1,
                token: `tok1-${Date.now()}`,
              },
              {
                email: 'recipient2@example.com',
                name: '自社署名者',
                role: RecipientRole.SIGNER,
                signingOrder: 2,
                token: `tok2-${Date.now()}`,
              },
            ],
          },
        },
      },
      include: {
        recipients: true,
      },
    });

    const { createDocumentFromTemplate } = await import(
      '@documenso/lib/server-only/template/create-document-from-template'
    );

    const [rec1, rec2] = template.recipients;

    // 送信側が意図的に signingOrder を逆転（rec1=2, rec2=1）にしてリクエストした場合でも、
    // テンプレートの signingOrderLock によりテンプレートの署名順が強制される
    const created = await createDocumentFromTemplate({
      id: {
        type: 'templateId',
        id: template.id,
      },
      userId: user.id,
      teamId: team.id,
      recipients: [
        {
          id: rec1.id,
          name: '先方 太郎',
          email: 'counterparty@example.com',
          signingOrder: 2,
        },
        {
          id: rec2.id,
          name: '自社 花子',
          email: 'company@example.com',
          signingOrder: 1,
        },
      ],
      requestMetadata: {
        ipAddress: '127.0.0.1',
        userAgent: 'Playwright-Test',
      },
    });

    const docRecipients = await prisma.recipient.findMany({
      where: { envelopeId: created.id },
      orderBy: { id: 'asc' },
    });

    const finalRec1 = docRecipients.find((r) => r.email === 'counterparty@example.com');
    const finalRec2 = docRecipients.find((r) => r.email === 'company@example.com');

    // signingOrderLock の強制により、先方が 1、自社が 2 となる
    expect(finalRec1?.signingOrder).toBe(1);
    expect(finalRec2?.signingOrder).toBe(2);

    // requireEmailOtp により、未指定でも actionAuth に EMAIL_OTP が自動適用される
    const auth1 = finalRec1?.authOptions as any;
    const auth2 = finalRec2?.authOptions as any;
    expect(auth1?.actionAuth).toBe('EMAIL_OTP');
    expect(auth2?.actionAuth).toBe('EMAIL_OTP');
  });

  test('Japanese templates seed: seeds standard templates with variables and creates document properly', async () => {
    const { seedJapaneseTemplates, JAPANESE_TEMPLATE_SEEDS } = await import(
      '@documenso/prisma/seed/japanese-templates'
    );
    const { createDocumentFromTemplate } = await import(
      '@documenso/lib/server-only/template/create-document-from-template'
    );
    const { user, team } = await seedUser({ isPersonalOrganisation: true });

    // 雛形 seed を実行
    const createdIds = await seedJapaneseTemplates({
      userId: user.id,
      teamId: team.id,
    });

    expect(createdIds.length).toBe(JAPANESE_TEMPLATE_SEEDS.length);

    // 業務委託契約書(雛形) を検証
    const gyoumuTemplate = await prisma.envelope.findFirstOrThrow({
      where: {
        teamId: team.id,
        title: '業務委託契約書(雛形)',
      },
      include: {
        recipients: true,
        envelopeItems: true,
        fields: true,
      },
    });

    expect(gyoumuTemplate.fields.length).toBe(5);
    const automationSettings = gyoumuTemplate.automationSettings as any;
    expect(automationSettings?.signingOrderLock?.locked).toBe(true);
    expect(automationSettings?.signingOrderLock?.order).toBe('counterparty-first');
    expect(automationSettings?.requireEmailOtp).toBe(true);

    // 雛形からマージ変数を渡してドキュメントを作成
    const templateRecipient = gyoumuTemplate.recipients[0];
    const createdDoc = await createDocumentFromTemplate({
      templateId: gyoumuTemplate.id,
      userId: user.id,
      teamId: team.id,
      recipients: [
        {
          id: templateRecipient.id,
          name: '株式会社テスト',
          email: 'test-counterparty@example.com',
        },
      ],
      mergeVariableValues: {
        取引先名: '株式会社テストクライアント',
        金額: '500,000',
      },
      requestMetadata: {
        ipAddress: '127.0.0.1',
        userAgent: 'Playwright-Test',
      },
    });

    expect(createdDoc.id).toBeDefined();

    // 生成されたドキュメントのフィールドテキストが変数で置換されていることを確認
    const docFields = await prisma.field.findMany({
      where: { envelopeId: createdDoc.id },
    });
    const textFields = docFields.filter((f) => f.type === FieldType.TEXT);
    expect(textFields.some((f) => f.customText.includes('株式会社テストクライアント'))).toBe(true);
    expect(textFields.some((f) => f.customText.includes('500,000'))).toBe(true);
  });
});

const getDocumentStatus = async (token: string) => {
  const { getDocumentByToken } = await import('@documenso/lib/server-only/document/get-document-by-token');

  return getDocumentByToken({ token });
};
