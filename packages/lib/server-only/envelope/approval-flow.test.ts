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
    name: null as string | null,
    email: (data.email as string | null | undefined) ?? null,
    userId: null as number | null,
    userAgent: null as string | null,
    ipAddress: null as string | null,
    prevHash: (data.prevHash as string | null | undefined) ?? null,
    hash: (data.hash as string | null | undefined) ?? null,
  });

  // 本来呼ばれてはいけない呼び出しを検出するモックの既定挙動。
  const wormViolation = (): Promise<never> =>
    Promise.reject(new Error('DocumentAuditLog is immutable: update/delete operations are not allowed.'));

  const mustRunInTransaction = (target: string): Promise<never> =>
    Promise.reject(new Error(`${target} must run inside prisma.$transaction.`));

  const tx = {
    recipient: { update: vi.fn(async () => undefined) },
    envelope: { update: vi.fn(async () => undefined) },
    documentAuditLog: {
      findFirst: vi.fn(async (): Promise<unknown> => null),
      create: vi.fn(createAuditLogRow),
      update: vi.fn(wormViolation),
    },
  };

  const prisma = {
    $transaction: vi.fn(async (cb: (client: typeof tx) => Promise<unknown>) => cb(tx)),
    recipient: {
      findFirst: vi.fn(async (): Promise<unknown> => null),
      update: vi.fn(() => mustRunInTransaction('recipient.update')),
    },
    envelope: {
      findFirst: vi.fn(async (): Promise<unknown> => null),
      update: vi.fn(() => mustRunInTransaction('envelope.update')),
    },
    documentAuditLog: {
      findFirst: vi.fn(async (): Promise<unknown> => null),
      create: vi.fn(() => mustRunInTransaction('documentAuditLog.create')),
      update: vi.fn(wormViolation),
    },
  };

  return { tx, prisma };
});

vi.mock('@documenso/prisma', () => ({ prisma: mocks.prisma }));

import { RecipientRole } from '@prisma/client';

import { computeAuditLogHash } from '../document-audit-log-hash';
import { approveEnvelopeByRecipient, rejectEnvelopeByRecipient } from './approval-flow';

type CreatedAuditLog = {
  id: string;
  createdAt: Date;
  type: string;
  data: unknown;
  prevHash: string;
  hash: string;
};

const getCreatedAuditLog = (): CreatedAuditLog => {
  const args = mocks.tx.documentAuditLog.create.mock.calls[0][0];

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

/**
 * jsonb はオブジェクトキーを「キー長 → バイト順」で保存するため、
 * ハッシュ計算入力のキーも同じ順序になっていることを確認する。
 */
const expectKeysInJsonbOrder = (data: unknown) => {
  const keys = Object.keys(data as Record<string, unknown>);

  expect(keys).toEqual([...keys].sort((a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0)));
};

describe('approval-flow(承認/差し戻しの監査ログ書き込み)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.prisma.$transaction.mockImplementation(async (cb) => cb(mocks.tx));
    mocks.prisma.recipient.findFirst.mockImplementation(async () => null);
    mocks.prisma.envelope.findFirst.mockImplementation(async () => null);
    mocks.tx.documentAuditLog.findFirst.mockImplementation(async () => null);
  });

  it('承認: recipient 更新と監査ログ insert を 1 トランザクションで実行する', async () => {
    mocks.prisma.recipient.findFirst.mockResolvedValue({
      id: 1,
      envelopeId: 'envelope_1',
      role: RecipientRole.APPROVER,
      signingStatus: 'NOT_SIGNED',
      email: 'approver@example.com',
    });
    mocks.prisma.envelope.findFirst.mockResolvedValue({
      status: 'PENDING',
      recipients: [{ id: 1, signingStatus: 'SIGNED', email: 'approver@example.com' }],
    });

    const result = await approveEnvelopeByRecipient({ envelopeId: 'envelope_1', recipientId: 1 });

    expect(result).toEqual({ success: true, status: 'APPROVED' });

    // recipient 更新と監査ログ作成は同一トランザクション配下(途中失敗で承認済みだけ残らない)
    expect(mocks.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.recipient.update).not.toHaveBeenCalled();
    expect(mocks.tx.recipient.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { signingStatus: 'SIGNED', signedAt: expect.any(Date) },
    });

    // WORM のため create は 1 回、update は 0 回
    expect(mocks.tx.documentAuditLog.create).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.documentAuditLog.create).not.toHaveBeenCalled();
    expect(mocks.tx.documentAuditLog.update).not.toHaveBeenCalled();
    expect(mocks.prisma.documentAuditLog.update).not.toHaveBeenCalled();

    const row = getCreatedAuditLog();

    expect(row.type).toBe('ENVELOPE_APPROVAL_GRANTED');
    expect(row.prevHash).toBe('');
    expect(row.data).toEqual({
      recipientId: 1,
      role: RecipientRole.APPROVER,
      recipientEmail: 'approver@example.com',
    });
    expectKeysInJsonbOrder(row.data);
    expectHashMatchesRow(row);
  });

  it('承認: 承認済み recipient は not-pending を返し、書き込みを行わない', async () => {
    mocks.prisma.recipient.findFirst.mockResolvedValue({
      id: 1,
      envelopeId: 'envelope_1',
      role: RecipientRole.APPROVER,
      signingStatus: 'SIGNED',
      email: 'approver@example.com',
    });

    const result = await approveEnvelopeByRecipient({ envelopeId: 'envelope_1', recipientId: 1 });

    expect(result).toEqual({ success: false, reason: 'not-pending' });
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.tx.documentAuditLog.create).not.toHaveBeenCalled();
  });

  it('差し戻し: エンベロープ更新・理由・監査ログを 1 トランザクションで実行する', async () => {
    mocks.prisma.recipient.findFirst.mockResolvedValue({
      id: 2,
      envelopeId: 'envelope_1',
      role: RecipientRole.APPROVER,
      signingStatus: 'NOT_SIGNED',
      email: 'approver@example.com',
    });
    mocks.tx.documentAuditLog.findFirst.mockResolvedValue({ hash: 'prev-hash-abc' });

    const result = await rejectEnvelopeByRecipient({
      envelopeId: 'envelope_1',
      recipientId: 2,
      reason: '資料が不足しています',
    });

    expect(result).toEqual({ success: true, status: 'REJECTED' });

    expect(mocks.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.envelope.update).not.toHaveBeenCalled();
    expect(mocks.tx.envelope.update).toHaveBeenCalledWith({
      where: { id: 'envelope_1' },
      data: { status: 'DRAFT', completedAt: null },
    });
    expect(mocks.tx.recipient.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { rejectionReason: '資料が不足しています' },
    });

    expect(mocks.tx.documentAuditLog.create).toHaveBeenCalledTimes(1);
    expect(mocks.tx.documentAuditLog.update).not.toHaveBeenCalled();
    expect(mocks.prisma.documentAuditLog.update).not.toHaveBeenCalled();

    const row = getCreatedAuditLog();

    expect(row.type).toBe('ENVELOPE_APPROVAL_REJECTED');
    expect(row.prevHash).toBe('prev-hash-abc');
    expect(row.data).toEqual({
      recipientId: 2,
      role: RecipientRole.APPROVER,
      reason: '資料が不足しています',
      recipientEmail: 'approver@example.com',
    });
    expectHashMatchesRow(row);
  });
});
