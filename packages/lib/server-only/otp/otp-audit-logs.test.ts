import { beforeEach, describe, expect, it, vi } from 'vitest';

// テストでは DB に接続しないため、Prisma クライアントはモックする。
// WORM(電子帳簿保存法)制約: documentAuditLog の update は常にエラーになる挙動を再現する。
const mocks = vi.hoisted(() => {
  type AuditCreateArgs = { data: Record<string, unknown> };

  const createAuditLogRow = async ({ data }: AuditCreateArgs) => ({
    id: data.id as string,
    createdAt: data.createdAt as Date,
    envelopeId: data.envelopeId as string | null,
    type: data.type as string,
    data: data.data,
    name: (data.name as string | null | undefined) ?? null,
    email: (data.email as string | null | undefined) ?? null,
    userId: null as number | null,
    userAgent: (data.userAgent as string | null | undefined) ?? null,
    ipAddress: (data.ipAddress as string | null | undefined) ?? null,
    prevHash: (data.prevHash as string | null | undefined) ?? null,
    hash: (data.hash as string | null | undefined) ?? null,
  });

  // 本来呼ばれてはいけない呼び出しを検出するモックの既定挙動。
  const wormViolation = (): Promise<never> =>
    Promise.reject(new Error('DocumentAuditLog is immutable: update/delete operations are not allowed.'));

  return {
    documentAuditLog: {
      findFirst: vi.fn(async (): Promise<unknown> => null),
      create: vi.fn(createAuditLogRow),
      update: vi.fn(wormViolation),
    },
  };
});

vi.mock('@documenso/prisma', () => ({ prisma: mocks }));

import { DocumentAuth } from '@documenso/lib/types/document-auth';

import { computeAuditLogHash } from '../document-audit-log-hash';
import { OTP_AUDIT_LOG_TYPES, recordOtpAuditLog } from './otp-audit-logs';

type CreatedAuditLog = {
  id: string;
  createdAt: Date;
  type: string;
  data: unknown;
  email: string | null;
  ipAddress: string | null;
  prevHash: string;
  hash: string;
};

const getCreatedAuditLog = (): CreatedAuditLog => {
  const args = mocks.documentAuditLog.create.mock.calls[0][0];

  return args.data as unknown as CreatedAuditLog;
};

/**
 * verifyAuditLogHashChain / バックフィルと同じ計算でハッシュが一致することを確認する。
 */
const expectHashMatchesRow = (row: CreatedAuditLog) => {
  expect(row.hash).toBe(
    computeAuditLogHash({ id: row.id, createdAt: row.createdAt, type: row.type, data: row.data }, row.prevHash),
  );
};

describe('otp-audit-logs(OTP 監査ログ書き込み)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.documentAuditLog.findFirst.mockImplementation(async () => null);
  });

  it('ハッシュを create 前に計算し、prevHash + hash を 1 回の insert で書き込む', async () => {
    mocks.documentAuditLog.findFirst.mockResolvedValue({ hash: 'otp-prev-hash' });

    const result = await recordOtpAuditLog({
      envelopeId: 'envelope_1',
      recipientId: 10,
      type: OTP_AUDIT_LOG_TYPES.OTP_SENT,
      email: 'signer@example.com',
      ipAddress: '203.0.113.10',
      attemptCount: 1,
    });

    // WORM のため create は 1 回、update は 0 回
    expect(mocks.documentAuditLog.create).toHaveBeenCalledTimes(1);
    expect(mocks.documentAuditLog.update).not.toHaveBeenCalled();

    const row = getCreatedAuditLog();

    expect(row.type).toBe(OTP_AUDIT_LOG_TYPES.OTP_SENT);
    expect(row.prevHash).toBe('otp-prev-hash');
    expect(row.email).toBe('signer@example.com');
    expect(row.ipAddress).toBe('203.0.113.10');
    // OTP 値そのものは記録しない(認証方式・試行回数のみ)
    expect(row.data).toEqual({
      recipientId: 10,
      authType: DocumentAuth.EMAIL_OTP,
      attemptCount: 1,
    });
    expectHashMatchesRow(row);
    expect(result.hash).toBe(row.hash);
  });

  it('attemptCount 未指定では data に含めず、チェーン先頭(prevHash なし)として記録する', async () => {
    const result = await recordOtpAuditLog({
      envelopeId: 'envelope_2',
      recipientId: 5,
      type: OTP_AUDIT_LOG_TYPES.OTP_VERIFIED,
    });

    expect(mocks.documentAuditLog.update).not.toHaveBeenCalled();

    const row = getCreatedAuditLog();

    expect(row.prevHash).toBe('');
    expect(row.data).toEqual({
      recipientId: 5,
      authType: DocumentAuth.EMAIL_OTP,
    });
    expectHashMatchesRow(row);
    expect(result.hash).toBe(row.hash);
  });
});
