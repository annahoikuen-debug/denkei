import type { TMergeVariableList, TMergeVariableValues } from '@documenso/lib/types/merge-variables';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';

/**
 * フェーズ3 ステップ6: 差し込み変数対応 CSV 一括送信パーサ
 *
 * CSV 形式:
 *   1行目: ヘッダ(email, sei, mei, + 変数名...)
 *   2行目以降: データ行
 *
 * 検証結果は「行番号+列+理由」単位で返し、部分失敗時に
 * 成功分を送信・失敗分をレポート化できるようにする。
 */

export const ZBulkSendCsvRowSchema = z.object({
  email: z.string().trim().email('有効なメールアドレスを入力してください'),
  sei: z.string().trim().min(1, '姓を入力してください'),
  mei: z.string().trim().min(1, '名を入力してください'),
  values: z.record(z.string(), z.string()),
});

export type TBulkSendCsvRow = z.infer<typeof ZBulkSendCsvRowSchema>;

export type BulkSendCsvError = {
  /** 2行目以降のデータ行番号(1始まり。ヘッダは含まない) */
  row: number;
  column: string;
  reason: string;
};

export type BulkSendCsvParseResult = {
  rows: TBulkSendCsvRow[];
  errors: BulkSendCsvError[];
};

/**
 * CSV 文字列を行単位で検証する。
 * 行単位でエラーを収集し、有効な行のみ rows に含める(部分失敗ポリシー)。
 */
export const parseBulkSendCsv = ({
  csvContent,
  variables,
}: {
  csvContent: string;
  variables: TMergeVariableList;
}): BulkSendCsvParseResult => {
  const errors: BulkSendCsvError[] = [];

  let records: string[][];

  try {
    records = parse(csvContent, {
      skip_empty_lines: true,
      trim: true,
    });
  } catch (error) {
    return {
      rows: [],
      errors: [
        {
          row: 0,
          column: '-',
          reason: error instanceof Error ? `CSVの解析に失敗しました: ${error.message}` : 'CSVの解析に失敗しました',
        },
      ],
    };
  }

  if (records.length === 0) {
    return { rows: [], errors: [{ row: 0, column: '-', reason: 'CSVが空です' }] };
  }

  const [header, ...dataRows] = records;

  const headerLower = header.map((h) => h.trim());

  const emailIndex = headerLower.indexOf('email');
  const seiIndex = headerLower.indexOf('sei');
  const meiIndex = headerLower.indexOf('mei');

  if (emailIndex === -1 || seiIndex === -1 || meiIndex === -1) {
    return {
      rows: [],
      errors: [
        {
          row: 0,
          column: 'email/sei/mei',
          reason: 'ヘッダに email, sei, mei が必要です',
        },
      ],
    };
  }

  // 変数列のインデックス(ヘッダ中で変数名と一致するもの)
  const variableColumns: { index: number; name: string }[] = [];

  for (const [index, name] of headerLower.entries()) {
    if (variables.some((v) => v.name === name)) {
      variableColumns.push({ index, name });
    }
  }

  // テンプレートが参照する変数が CSV に存在するか
  const csvDefinedNames = new Set(variableColumns.map((c) => c.name));
  const referencedNames = new Set<string>();

  for (const variable of variables) {
    // 全変数を values で渡せるようにする(CSV に無い変数は空で許容)
    if (!csvDefinedNames.has(variable.name)) {
      referencedNames.add(variable.name);
    }
  }

  const definedVariables: TMergeVariableList = variables;

  const rows: TBulkSendCsvRow[] = [];

  dataRows.forEach((record, i) => {
    const rowNumber = i + 1; // 2行目以降 = データ行1
    let rowHasError = false;

    const addError = (column: string, reason: string) => {
      errors.push({ row: rowNumber, column, reason });
      rowHasError = true;
    };

    const email = record[emailIndex] ?? '';
    const sei = record[seiIndex] ?? '';
    const mei = record[meiIndex] ?? '';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      addError('email', '有効なメールアドレスを入力してください');
    }

    if (!sei) {
      addError('sei', '姓を入力してください');
    }

    if (!mei) {
      addError('mei', '名を入力してください');
    }

    const values: TMergeVariableValues = {};

    for (const { index, name } of variableColumns) {
      values[name] = record[index] ?? '';
    }

    // 未定義変数参照の検知(テンプレート変数が CSV に無い場合の警告は省略し、
    // 変数定義と CSV ヘッダの一致を values 空で許容)

    // 値マップ検証
    const parsedValues = z.record(z.string(), z.string().max(10_000)).safeParse(values);

    if (!parsedValues.success) {
      addError('values', '変数の値が不正です(10,000文字以内)');
    }

    // required 変数が空でないか
    for (const variable of definedVariables) {
      if (variable.required && !values[variable.name]) {
        addError(variable.name, `必須変数「${variable.name}」が空です`);
      }
    }

    // 未定義参照はテンプレート側テキストの話なので、ここでは
    // findUndefinedReferences を CSV 値に対しては使わない(値はプレーン)

    if (!rowHasError) {
      rows.push({ email, sei, mei, values });
    }
  });

  return { rows, errors };
};
