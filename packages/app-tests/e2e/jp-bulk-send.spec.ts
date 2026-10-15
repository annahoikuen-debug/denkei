import { parseBulkSendCsv } from '@documenso/lib/server-only/template/bulk-send-csv';
import { mergeText } from '@documenso/lib/server-only/template/merge';
import { expect, test } from '@playwright/test';

/**
 * フェーズ3 ステップ16: CSV 一括送信 E2E
 *
 * パーサ・差し込みはユニットテスト済みのため、ここでは
 * 「正常 CSV の全行送信準備」「部分失敗時の成功分送信+失敗分レポート」
 * の統合挙動を検証する(UI 結合は CI で実施)。
 */
test.describe('[JP] Bulk Send', () => {
  const variables = [
    { name: '取引先名', type: 'text' as const, required: true },
    { name: '金額', type: 'number' as const, required: true, format: 'jpy' as const },
  ];

  test('valid CSV: all rows pass validation and merge succeeds', () => {
    const csv = `email,sei,mei,取引先名,金額
a@example.com,田中,太郎,株式会社A,1000
b@example.com,鈴木,一郎,株式会社B,2000`;

    const parsed = parseBulkSendCsv({ csvContent: csv, variables });

    expect(parsed.errors).toHaveLength(0);
    expect(parsed.rows).toHaveLength(2);

    // 各行で差し込みが成功する
    for (const row of parsed.rows) {
      const merged = mergeText({
        text: '契約先: {{取引先名}} / 金額: {{金額}}',
        values: row.values,
        variables,
      });

      expect(merged.success).toBe(true);
    }
  });

  test('partial failure: valid rows are sendable, invalid rows reported with row numbers', () => {
    const csv = `email,sei,mei,取引先名,金額
a@example.com,田中,太郎,株式会社A,1000
bad-email,鈴木,一郎,株式会社B,2000
c@example.com,,花子,株式会社C,
d@example.com,山田,次郎,株式会社D,4000`;

    const parsed = parseBulkSendCsv({ csvContent: csv, variables });

    // 成功分(送信可能): a と d
    expect(parsed.rows.map((r) => r.email)).toEqual(['a@example.com', 'd@example.com']);

    // 失敗分レポート: 行番号付き ja エラー
    const reportLines = parsed.errors.map((e) => `${e.row}行目 [${e.column}]: ${e.reason}`);

    expect(reportLines.some((line) => line.startsWith('2行目'))).toBe(true);
    expect(reportLines.some((line) => line.startsWith('3行目'))).toBe(true);
    expect(parsed.errors.length).toBeGreaterThanOrEqual(3);
  });

  test('all invalid: nothing is sendable', () => {
    const csv = `email,sei,mei,取引先名,金額
bad-email,田中,太郎,,`;

    const parsed = parseBulkSendCsv({ csvContent: csv, variables });

    expect(parsed.rows).toHaveLength(0);
    expect(parsed.errors.length).toBeGreaterThan(0);
  });

  test('validateBulkSendCsv backwards compatibility and variable extraction', async () => {
    const { validateBulkSendCsv } = await import('@documenso/lib/server-only/template/validate-bulk-send-csv');
    const csv = `recipient_1_email,recipient_1_name,取引先名,契約金額
tanaka@example.com,田中太郎,株式会社電契,1500000`;

    const result = validateBulkSendCsv({
      csvContent: csv,
      recipientCount: 1,
      templateVariables: [
        { id: '1', name: '取引先名', type: 'text', required: true },
        { id: '2', name: '契約金額', type: 'currency', required: true },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].recipient_1_email).toBe('tanaka@example.com');
      expect(result.data[0].取引先名).toBe('株式会社電契');
      expect(result.data[0].契約金額).toBe('1500000');
    }
  });
});
