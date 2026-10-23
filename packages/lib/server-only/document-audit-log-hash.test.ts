import { describe, expect, it } from 'vitest';

import { buildAuditLogPayload, computeAuditLogHash, verifyAuditLogHashChain } from './document-audit-log-hash';

const baseEntry = {
  id: 'log_1',
  createdAt: new Date('2026-10-15T00:00:00.000Z'),
  type: 'DOCUMENT_CREATED',
  data: { foo: 'bar' },
};

describe('audit log hash chain', () => {
  it('単一レコードのチェーンを検証できる', () => {
    const hash = computeAuditLogHash(baseEntry, '');

    expect(verifyAuditLogHashChain([{ ...baseEntry, prevHash: '', hash }])).toEqual({ isValid: true });
  });

  it('連続するレコードのチェーンを検証できる', () => {
    const hash1 = computeAuditLogHash(baseEntry, '');

    const entry2 = { ...baseEntry, id: 'log_2', type: 'FIELD_INSERTED' };
    const hash2 = computeAuditLogHash(entry2, hash1);

    expect(
      verifyAuditLogHashChain([
        { ...baseEntry, prevHash: '', hash: hash1 },
        { ...entry2, prevHash: hash1, hash: hash2 },
      ]),
    ).toEqual({ isValid: true });
  });

  it('data を改変すると検証に失敗する(改変検知)', () => {
    const hash1 = computeAuditLogHash(baseEntry, '');

    expect(
      verifyAuditLogHashChain([
        {
          ...baseEntry,
          data: { foo: 'TAMPERED' },
          prevHash: '',
          hash: hash1,
        },
      ]),
    ).toEqual({ isValid: false, breakAtId: 'log_1' });
  });

  it('hash を改変すると検証に失敗する', () => {
    const hash1 = computeAuditLogHash(baseEntry, '');

    expect(verifyAuditLogHashChain([{ ...baseEntry, prevHash: '', hash: 'deadbeef' }])).toEqual({
      isValid: false,
      breakAtId: 'log_1',
    });
  });

  it('prevHash の連続性が崩れると検証に失敗する(削除検知)', () => {
    const hash1 = computeAuditLogHash(baseEntry, '');

    const entry2 = { ...baseEntry, id: 'log_2', type: 'FIELD_INSERTED' };
    const hash2 = computeAuditLogHash(entry2, hash1);

    // log_2 の prevHash に別の値(= log_1 を削除した形)を設定
    expect(verifyAuditLogHashChain([{ ...entry2, prevHash: 'different-prev', hash: hash2 }])).toEqual({
      isValid: false,
      breakAtId: 'log_2',
    });
  });

  it('hash 欠落レコードで検証に失敗する', () => {
    expect(verifyAuditLogHashChain([{ ...baseEntry, prevHash: '', hash: null }])).toEqual({
      isValid: false,
      breakAtId: 'log_1',
    });
  });

  it('ペイロードは決定的(同一入力で同一文字列)', () => {
    expect(buildAuditLogPayload(baseEntry)).toBe(buildAuditLogPayload({ ...baseEntry }));
  });
});
