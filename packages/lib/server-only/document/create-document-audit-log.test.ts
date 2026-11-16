import type { prisma } from '@documenso/prisma';
import type { Prisma } from '@documenso/prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { DOCUMENT_AUDIT_LOG_TYPE } from '../../types/document-audit-logs';
import { createDocumentAuditLog } from './create-document-audit-log';

describe('createDocumentAuditLog', () => {
  it('トランザクションクライアント内で Envelope の行ロック(FOR UPDATE)を実行し、直前ハッシュを引き継ぐ', async () => {
    const mockExecuteRaw = vi.fn().mockResolvedValue(1);
    const mockFindFirst = vi.fn().mockResolvedValue({ hash: 'prev_hash_12345' });
    const mockCreate = vi.fn().mockImplementation(async ({ data }) => ({
      ...data,
      id: data.id ?? 'log_1',
    }));

    const mockTx = {
      $executeRaw: mockExecuteRaw,
      documentAuditLog: {
        findFirst: mockFindFirst,
        create: mockCreate,
      },
    } as unknown as Prisma.TransactionClient;

    const result = await createDocumentAuditLog(mockTx, {
      envelopeId: 'env_test_1',
      type: DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_CREATED,
    });

    // 行ロックが呼ばれたこと
    expect(mockExecuteRaw).toHaveBeenCalledTimes(1);

    // 直前ハッシュが引き継がれていること
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const createCallData = mockCreate.mock.calls[0][0].data;
    expect(createCallData.prevHash).toBe('prev_hash_12345');
    expect(createCallData.hash).toBeDefined();
    expect(createCallData.envelopeId).toBe('env_test_1');
    expect(result.prevHash).toBe('prev_hash_12345');
  });

  it('初回ログ(直前ログなし)の場合は prevHash が空文字になる', async () => {
    const mockExecuteRaw = vi.fn().mockResolvedValue(1);
    const mockFindFirst = vi.fn().mockResolvedValue(null);
    const mockCreate = vi.fn().mockImplementation(async ({ data }) => data);

    const mockTx = {
      $executeRaw: mockExecuteRaw,
      documentAuditLog: {
        findFirst: mockFindFirst,
        create: mockCreate,
      },
    } as unknown as Prisma.TransactionClient;

    await createDocumentAuditLog(mockTx, {
      envelopeId: 'env_test_2',
      type: DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_CREATED,
    });

    const createCallData = mockCreate.mock.calls[0][0].data;
    expect(createCallData.prevHash).toBe('');
    expect(createCallData.hash).toBeTruthy();
  });

  it('通常 Prisma クライアントの場合は $transaction を張って実行する', async () => {
    const mockExecuteRaw = vi.fn().mockResolvedValue(1);
    const mockFindFirst = vi.fn().mockResolvedValue(null);
    const mockCreate = vi.fn().mockImplementation(async ({ data }) => data);

    const innerTx = {
      $executeRaw: mockExecuteRaw,
      documentAuditLog: {
        findFirst: mockFindFirst,
        create: mockCreate,
      },
    };

    const mockPrisma = {
      $transaction: vi.fn().mockImplementation(async (cb) => {
        return await cb(innerTx);
      }),
    } as unknown as typeof prisma;

    await createDocumentAuditLog(mockPrisma, {
      envelopeId: 'env_test_3',
      type: DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_OPENED,
    });

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockExecuteRaw).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});
