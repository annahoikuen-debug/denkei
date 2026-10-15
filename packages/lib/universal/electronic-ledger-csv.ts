/**
 * フェーズ1 ステップ35: 電子帳簿保存法 対応 CSV 出力ユーティリティ
 *
 * - ヘッダ + 行の2次元配列を CSV 文字列に変換
 * - Excel 互換のため BOM 付き UTF-8 で出力
 * - 電帳法の検索要件(取引先名・金額・締結日)を満たす列を含む
 */

export type ElectronicLedgerCsvRow = {
    documentId: string;
    title: string;
    contractType: string | null;
    counterpartyName: string | null;
    contractAmount: number | null;
    contractDate: string | null; // yyyy-MM-dd
    completedAt: string | null; // ISO
};

const CSV_HEADERS = [
    'ドキュメントID',
    'タイトル',
    '契約種別',
    '取引先名',
    '金額(円)',
    '締結日',
    '完了日時',
] as const;

const escapeCsvField = (value: string | null | undefined): string => {
    if (value === null || value === undefined) {
        return '';
    }

    const str = String(value);

    // カンマ・ダブルクォート・改行を含む場合はクォート
    if (/[",\r\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
};

/**
 * 行データを CSV 文字列(BOM 付き UTF-8)に変換する。
 */
export const buildElectronicLedgerCsv = (rows: ElectronicLedgerCsvRow[]): string => {
    const lines: string[] = [];

    lines.push(CSV_HEADERS.map(escapeCsvField).join(','));

    for (const row of rows) {
        lines.push(
            [
                row.documentId,
                row.title,
                row.contractType,
                row.counterpartyName,
                row.contractAmount !== null ? String(row.contractAmount) : '',
                row.contractDate,
                row.completedAt,
            ]
                .map(escapeCsvField)
                .join(','),
        );
    }

    // BOM 付き UTF-8(Excel で文字化けしないように)
    return `\uFEFF${lines.join('\r\n')}`;
};
