import type { DocumentMeta, Envelope, Recipient } from '@prisma/client';
import { FieldType } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import { generateCertificatePdf } from './generate-certificate-pdf';

// フォントは <webapp>/public/fonts に配置され、実行時 CWD 前提で解決されるため
// vitest(パッケージルート CWD)では登録に失敗する。PDF 生成検証には不要なので no-op にする。
vi.mock('./helpers', () => ({
  ensureFontLibrary: vi.fn(),
}));

// renderCertificate は CWD 基準でブランディングロゴを読み込むため、
// ロゴ読み込みのみ 1x1 PNG のスタブに差し替える(worker では process.chdir 不可のため)。
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();

  // 1x1 透明 PNG
  const stubLogo = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  );

  const readFileSync = vi.fn((filePath: unknown, ...args: unknown[]) => {
    if (String(filePath).includes('logo.png')) {
      return stubLogo;
    }

    return actual.readFileSync(filePath as Parameters<typeof actual.readFileSync>[0], ...(args as never[]));
  });

  return {
    ...actual,
    default: {
      ...actual,
      readFileSync,
    },
  };
});

/**
 * フェーズ2 ステップ14: 締結証明書の本人確認(EMAIL_OTP)記載テスト。
 *
 * generateCertificatePdf は内部で Prisma(envelope claim / 監査ログ取得)へ依存するため、
 * その2モジュールをモックし、PDF 生成が最後まで完了することを検証する。
 *
 * 注意: このテストは Lingui マクロ(msg`)を含むモジュールを import するため、
 * vite-plugin-babel-macros が有効な vitest でのみ実行できる(E2E/tsx では不可)。
 */
vi.mock('../organisation/get-organisation-claims', () => ({
  getOrganisationClaimByTeamId: vi.fn().mockResolvedValue({
    flags: {
      hidePoweredBy: false,
    },
  }),
}));

vi.mock('../document/get-document-certificate-audit-logs', () => ({
  getDocumentCertificateAuditLogs: vi.fn().mockResolvedValue({
    groupedAuditLogs: {
      DOCUMENT_RECIPIENT_COMPLETED: [],
      DOCUMENT_RECIPIENT_REJECTED: [],
      DOCUMENT_OPENED: [],
      DOCUMENT_SENT: [],
      DOCUMENT_FIELD_INSERTED: [],
      EMAIL_SENT: [],
    },
    fullAuditLogsWithHash: [],
    hashChainVerification: { isValid: true },
  }),
}));

const mockEnvelope = {
  id: 'envelope_test',
  teamId: 1,
  userId: 1,
  title: 'テスト契約書',
  status: 'COMPLETED',
  type: 'DOCUMENT',
  authOptions: null,
  qrToken: null,
  documentMeta: {
    timezone: 'Asia/Tokyo',
  },
} as unknown as Omit<Envelope, 'completedAt'> & { documentMeta: DocumentMeta };

const mockRecipient = {
  id: 1,
  email: 'signer@example.com',
  name: 'テスト太郎',
  role: 'SIGNER',
  signingStatus: 'SIGNED',
  signedAt: new Date(),
  rejectionReason: null,
  authOptions: {
    accessAuth: ['EMAIL_OTP'],
    actionAuth: [],
  },
} as unknown as Recipient;

const mockFields = [
  {
    id: 1,
    type: FieldType.SIGNATURE,
    secondaryId: 'field_1',
    recipientId: 1,
    signature: {
      signatureImageAsBase64: null,
      typedSignature: 'テスト太郎',
    },
  },
];

describe('generateCertificatePdf', () => {
  it('generates a certificate PDF for a recipient authenticated with EMAIL_OTP', async () => {
    const certificatePdf = await generateCertificatePdf({
      envelope: mockEnvelope,
      envelopeOwner: {
        email: 'owner@example.com',
        name: 'テスト送信者',
      },
      recipients: [mockRecipient],
      fields: mockFields,
      language: 'ja',
      pageWidth: 595,
      pageHeight: 842,
    });

    const bytes = await certificatePdf.save();

    expect(bytes).toBeDefined();
    expect(bytes.length).toBeGreaterThan(1000);
    expect(certificatePdf.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it('generates a certificate PDF in English with EMAIL_OTP access auth', async () => {
    const certificatePdf = await generateCertificatePdf({
      envelope: mockEnvelope,
      envelopeOwner: {
        email: 'owner@example.com',
        name: 'Test Sender',
      },
      recipients: [mockRecipient],
      fields: mockFields,
      language: 'en',
      pageWidth: 595,
      pageHeight: 842,
    });

    const bytes = await certificatePdf.save();

    expect(bytes).toBeDefined();
    expect(bytes.length).toBeGreaterThan(1000);
  });

  it('falls back to Email auth level when the recipient has no auth options', async () => {
    const recipientWithoutAuth = {
      ...mockRecipient,
      authOptions: null,
    } as unknown as Recipient;

    const certificatePdf = await generateCertificatePdf({
      envelope: mockEnvelope,
      envelopeOwner: {
        email: 'owner@example.com',
        name: 'テスト送信者',
      },
      recipients: [recipientWithoutAuth],
      fields: mockFields,
      language: 'ja',
      pageWidth: 595,
      pageHeight: 842,
    });

    const bytes = await certificatePdf.save();

    expect(bytes).toBeDefined();
    expect(certificatePdf.getPageCount()).toBeGreaterThanOrEqual(1);
  });
});
