import { describe, expect, it } from 'vitest';

import { parseBulkSendCsv } from './bulk-send-csv';

const variables = [
    { name: '取引先名', type: 'text' as const, required: true },
    { name: '金額', type: 'number' as const, required: false, format: 'jpy' as const },
];

const validCsv = `email,sei,mei,取引先名,金額
a@example.com,田中,太郎,株式会社A,1000
b@example.com,鈴木,一郎,株式会社B,2000`;

describe('CSV 一括送信パーサ(フェーズ3 ステップ6)', () => {
    it('正常 CSV をパースできる', () => {
        const result = parseBulkSendCsv({ csvContent: validCsv, variables });

        expect(result.errors).toHaveLength(0);
        expect(result.rows).toHaveLength(2);
        expect(result.rows[0]).toEqual({
            email: 'a@example.com',
            sei: '田中',
            mei: '太郎',
            values: { 取引先名: '株式会社A', 金額: '1000' },
        });
    });

    it('異常行を混在させた場合、行番号+列+理由のエラーを返し、正常行のみ rows に含める', () => {
        const csv = `email,sei,mei,取引先名,金額
a@example.com,田中,太郎,株式会社A,1000
invalid-email,鈴木,一郎,株式会社B,2000
c@example.com,,花子,,5000
`;

        const result = parseBulkSendCsv({ csvContent: csv, variables });

        // 正常行1件のみ
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].email).toBe('a@example.com');

        // エラー: 行2の email、行3の sei と必須変数
        expect(result.errors).toEqual(
            expect.arrayContaining([
                { row: 2, column: 'email', reason: '有効なメールアドレスを入力してください' },
                { row: 3, column: 'sei', reason: '姓を入力してください' },
                { row: 3, column: '取引先名', reason: '必須変数「取引先名」が空です' },
            ]),
        );
    });

    it('ヘッダ不足を検知する', () => {
        const csv = `mail,name
a@example.com,x`;

        const result = parseBulkSendCsv({
            csvContent: csv,
            variables,
        });

        expect(result.rows).toHaveLength(0);
        expect(result.errors[0]).toMatchObject({ row: 0, reason: expect.stringContaining('email') });
    });

    it('空 CSV を検知する', () => {
        const result = parseBulkSendCsv({ csvContent: '', variables });

        expect(result.errors[0]).toMatchObject({ row: 0, reason: 'CSVが空です' });
    });

    it('巨大 CSV(1000行)を処理できる', () => {
        const header = 'email,sei,mei,取引先名,金額';
        const lines = Array.from(
            { length: 1000 },
            (_, i) => `user${i}@example.com,姓${i},名${i},株式会社${i},${i}`,
        );

        const result = parseBulkSendCsv({ csvContent: [header, ...lines].join('\n'), variables });

        expect(result.errors).toHaveLength(0);
        expect(result.rows).toHaveLength(1000);
    });

    it('カンマ・クォートを含む値を扱える', () => {
        const csv = `email,sei,mei,取引先名,金額
a@example.com,田中,太郎,"株式会社A, 営業部",1000`;

        const result = parseBulkSendCsv({ csvContent: csv, variables });

        expect(result.rows[0].values['取引先名']).toBe('株式会社A, 営業部');
    });
});
