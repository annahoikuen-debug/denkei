import { describe, expect, it } from 'vitest';

import { buildElectronicLedgerCsv } from './electronic-ledger-csv';

describe('buildElectronicLedgerCsv', () => {
    it('BOM 付き UTF-8 の CSV を生成する', () => {
        const csv = buildElectronicLedgerCsv([
            {
                documentId: 'env_1',
                title: '業務委託契約書',
                contractType: '業務委託',
                counterpartyName: '株式会社テスト',
                contractAmount: 1234567,
                contractDate: '2026-10-15',
                completedAt: '2026-10-15T09:00:00.000Z',
            },
        ]);

        expect(csv.startsWith('\uFEFF')).toBe(true);
        expect(csv).toContain('ドキュメントID,タイトル,契約種別,取引先名,金額(円),締結日,完了日時');
        expect(csv).toContain('株式会社テスト');
        expect(csv).toContain('1234567');
    });

    it('カンマやクォートを含む値をエスケープする', () => {
        const csv = buildElectronicLedgerCsv([
            {
                documentId: 'env_2',
                title: '契約書, 改訂版 "第二版"',
                contractType: null,
                counterpartyName: null,
                contractAmount: null,
                contractDate: null,
                completedAt: null,
            },
        ]);

        expect(csv).toContain('"契約書, 改訂版 ""第二版"""');
    });

    it('NULL 値は空フィールドになる', () => {
        const csv = buildElectronicLedgerCsv([
            {
                documentId: 'env_3',
                title: 'NDA',
                contractType: null,
                counterpartyName: null,
                contractAmount: null,
                contractDate: null,
                completedAt: null,
            },
        ]);

        const dataLine = csv.split('\r\n')[1];

        expect(dataLine).toBe('env_3,NDA,,,,,');
    });
});
