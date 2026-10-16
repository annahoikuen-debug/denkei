import fs from 'node:fs';
import path from 'node:path';
import { incrementTemplateId } from '@documenso/lib/server-only/envelope/increment-id';
import { FIELD_META_DEFAULT_VALUES } from '@documenso/lib/types/field-meta';
import { SignatureLevel } from '@documenso/lib/types/signature-level';
import { prefixedId } from '@documenso/lib/universal/id';
import { prisma } from '..';
import {
  DocumentDataType,
  DocumentSource,
  EnvelopeType,
  FieldType,
  ReadStatus,
  RecipientRole,
  SendStatus,
  SigningStatus,
} from '../client';

/**
 * フェーズ3 ステップ13 / 第5部 ステップ25-26: 日本語雛形テンプレートの同梱
 *
 * 業務委託契約・秘密保持契約(NDA)・売買契約の
 * 参考雛形(タイトル+テキストフィールド配置+変数定義+署名順固定)を seed する。
 * 利用にあたっては法務レビューを前提とする。
 */

const examplePdf = fs.readFileSync(path.join(__dirname, '../../../assets/example.pdf')).toString('base64');

export type JapaneseTemplateSeed = {
  title: string;
  description: string;
  fields: {
    type: FieldType;
    label: string;
    page: number;
    positionX: number;
    positionY: number;
    width: number;
    height: number;
    customText?: string;
  }[];
  mergeVariables: {
    name: string;
    type: 'text' | 'number' | 'date' | 'currency' | 'wareki';
    required: boolean;
    format?: 'plain' | 'comma' | 'jpy' | 'wareki_kanji' | 'wareki_short';
  }[];
  signingOrderLock?: {
    locked: boolean;
    order?: 'counterparty-first' | 'company-first';
  };
  requireEmailOtp?: boolean;
};

export const JAPANESE_TEMPLATE_SEEDS: JapaneseTemplateSeed[] = [
  {
    title: '業務委託契約書(雛形)',
    description:
      '業務委託契約の参考雛形。取引先名・委託内容・金額を差し込み変数で指定します。利用にあたっては法務レビューをお願いします。',
    fields: [
      {
        type: FieldType.SIGNATURE,
        label: '委託者署名',
        page: 1,
        positionX: 80,
        positionY: 680,
        width: 150,
        height: 50,
      },
      {
        type: FieldType.SIGNATURE,
        label: '受託者署名',
        page: 1,
        positionX: 360,
        positionY: 680,
        width: 150,
        height: 50,
      },
      { type: FieldType.DATE, label: '締結日', page: 1, positionX: 80, positionY: 740, width: 120, height: 24 },
      {
        type: FieldType.TEXT,
        label: '取引先名: {{取引先名}}',
        customText: '{{取引先名}}',
        page: 1,
        positionX: 80,
        positionY: 120,
        width: 400,
        height: 24,
      },
      {
        type: FieldType.TEXT,
        label: '契約金額: {{金額}}',
        customText: '{{金額}}',
        page: 1,
        positionX: 80,
        positionY: 160,
        width: 400,
        height: 24,
      },
    ],
    mergeVariables: [
      { name: '取引先名', type: 'text', required: true },
      { name: '金額', type: 'currency', required: true, format: 'jpy' },
    ],
    signingOrderLock: {
      locked: true,
      order: 'counterparty-first',
    },
    requireEmailOtp: true,
  },
  {
    title: '秘密保持契約書(NDA・雛形)',
    description:
      '秘密保持契約の参考雛形。取引先名と秘密保持期間を差し込み変数で指定します。利用にあたっては法務レビューをお願いします。',
    fields: [
      { type: FieldType.SIGNATURE, label: '甲署名', page: 1, positionX: 80, positionY: 680, width: 150, height: 50 },
      { type: FieldType.SIGNATURE, label: '乙署名', page: 1, positionX: 360, positionY: 680, width: 150, height: 50 },
      { type: FieldType.DATE, label: '締結日', page: 1, positionX: 80, positionY: 740, width: 120, height: 24 },
      {
        type: FieldType.TEXT,
        label: '乙: {{取引先名}}',
        customText: '{{取引先名}}',
        page: 1,
        positionX: 80,
        positionY: 120,
        width: 400,
        height: 24,
      },
      {
        type: FieldType.TEXT,
        label: '秘密保持期間: {{保持期間}}',
        customText: '{{保持期間}}',
        page: 1,
        positionX: 80,
        positionY: 160,
        width: 400,
        height: 24,
      },
    ],
    mergeVariables: [
      { name: '取引先名', type: 'text', required: true },
      { name: '保持期間', type: 'text', required: true },
    ],
    signingOrderLock: {
      locked: false,
    },
    requireEmailOtp: false,
  },
  {
    title: '売買契約書(雛形)',
    description:
      '売買契約の参考雛形。取引先名・売買物件・金額を差し込み変数で指定します。利用にあたっては法務レビューをお願いします。',
    fields: [
      { type: FieldType.SIGNATURE, label: '売主署名', page: 1, positionX: 80, positionY: 680, width: 150, height: 50 },
      {
        type: FieldType.SIGNATURE,
        label: '買主署名',
        page: 1,
        positionX: 360,
        positionY: 680,
        width: 150,
        height: 50,
      },
      { type: FieldType.DATE, label: '締結日', page: 1, positionX: 80, positionY: 740, width: 120, height: 24 },
      {
        type: FieldType.TEXT,
        label: '取引先名: {{取引先名}}',
        customText: '{{取引先名}}',
        page: 1,
        positionX: 80,
        positionY: 120,
        width: 400,
        height: 24,
      },
      {
        type: FieldType.TEXT,
        label: '売買金額: {{金額}}',
        customText: '{{金額}}',
        page: 1,
        positionX: 80,
        positionY: 160,
        width: 400,
        height: 24,
      },
    ],
    mergeVariables: [
      { name: '取引先名', type: 'text', required: true },
      { name: '金額', type: 'currency', required: true, format: 'jpy' },
    ],
    signingOrderLock: {
      locked: true,
      order: 'counterparty-first',
    },
    requireEmailOtp: true,
  },
];

/**
 * 雛形テンプレートを seed する(冪等: 既存タイトルはスキップ)。
 */
export const seedJapaneseTemplates = async ({ userId, teamId }: { userId: number; teamId: number }) => {
  const created: string[] = [];

  for (const seed of JAPANESE_TEMPLATE_SEEDS) {
    const existing = await prisma.envelope.findFirst({
      where: { title: seed.title, teamId, type: 'TEMPLATE' },
    });

    if (existing) {
      continue;
    }

    const templateId = await incrementTemplateId();

    const documentData = await prisma.documentData.create({
      data: {
        type: DocumentDataType.BYTES_64,
        data: examplePdf,
        initialData: examplePdf,
      },
    });

    const documentMeta = await prisma.documentMeta.create({
      data: {
        language: 'ja',
        timezone: 'Asia/Tokyo',
        signingOrder: seed.signingOrderLock?.locked ? 'SEQUENTIAL' : 'PARALLEL',
      },
    });

    const envelope = await prisma.envelope.create({
      data: {
        id: prefixedId('envelope'),
        secondaryId: templateId.formattedTemplateId,
        title: seed.title,
        type: EnvelopeType.TEMPLATE,
        status: 'DRAFT',
        internalVersion: 2,
        userId,
        teamId,
        source: DocumentSource.TEMPLATE,
        signatureLevel: SignatureLevel.SES,
        documentMetaId: documentMeta.id,
        automationSettings: {
          mergeVariables: seed.mergeVariables,
          signingOrderLock: seed.signingOrderLock ?? { locked: false },
          approval: { enabled: false, rejectToDraft: true },
          requireEmailOtp: seed.requireEmailOtp ?? false,
        },
        envelopeItems: {
          create: {
            id: prefixedId('envelope_item'),
            title: seed.title,
            order: 1,
            documentDataId: documentData.id,
          },
        },
        recipients: {
          create: {
            email: 'signer@example.com',
            name: '署名者',
            token: Math.random().toString(36).slice(2, 9),
            role: RecipientRole.SIGNER,
            sendStatus: SendStatus.NOT_SENT,
            signingStatus: SigningStatus.NOT_SIGNED,
            readStatus: ReadStatus.NOT_OPENED,
          },
        },
      },
      include: {
        recipients: true,
        envelopeItems: true,
      },
    });

    const recipientId = envelope.recipients[0].id;
    const envelopeItemId = envelope.envelopeItems[0].id;

    for (const field of seed.fields) {
      await prisma.field.create({
        data: {
          envelopeId: envelope.id,
          envelopeItemId,
          recipientId,
          type: field.type,
          page: field.page,
          positionX: field.positionX,
          positionY: field.positionY,
          width: field.width,
          height: field.height,
          customText: field.customText ?? '',
          inserted: false,
          fieldMeta: FIELD_META_DEFAULT_VALUES[field.type] ?? undefined,
        },
      });
    }

    created.push(envelope.id);
  }

  return created;
};
