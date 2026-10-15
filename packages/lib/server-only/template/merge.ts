import {
  findUnboundVariables,
  MERGE_VARIABLE_PATTERN,
  type TMergeVariableList,
  type TMergeVariableValues,
} from '@documenso/lib/types/merge-variables';

/**
 * フェーズ3 ステップ4: 差し込み(マージ)エンジン
 *
 * テンプレート送信時に `{{変数}}` へ値をバインドする server-only エンジン。
 * - 未バインド変数の検知(送信ブロック用)
 * - 特殊文字(HTML/CSV インジェクション)のサニタイズ
 * - number 型のフォーマット(comma / jpy)
 */

export type MergeResult = { success: true; mergedText: string } | { success: false; missingVariables: string[] };

/**
 * 値をサニタイズする(制御文字・波括弧の排除)。
 */
const sanitizeValue = (value: string): string => {
  return (
    value
      // 制御文字を除去(タブ・改行は半角スペースへ)
      .replace(/[\p{C}\p{Zl}\p{Zp}]/gu, (c) => (/[\n\r\t]/.test(c) ? ' ' : ''))
      // 変数記法のネスト(インジェクション)を無効化
      .replace(/[{}]/g, '')
      .trim()
  );
};

import { toWareki } from '../../universal/wareki-date';

/**
 * number / currency 型変数のフォーマット。
 */
const formatNumberValue = (value: string, format: string | undefined): string => {
  const num = Number(value.replace(/,/g, ''));

  if (Number.isNaN(num)) {
    return sanitizeValue(value);
  }

  if (format === 'jpy') {
    return `¥${num.toLocaleString('ja-JP')}`;
  }

  if (format === 'comma') {
    return num.toLocaleString('ja-JP');
  }

  return value;
};

/**
 * date / wareki 型変数のフォーマット。
 */
const formatDateValue = (value: string, format: string | undefined): string => {
  if (format === 'wareki_kanji' || format === 'wareki_short') {
    const wareki = toWareki(value);
    if (wareki) {
      return wareki;
    }
  }

  return sanitizeValue(value);
};

/**
 * テキストに変数をバインドする。
 * 未バインド(値が無い)変数がある場合は success: false を返す。
 */
export const mergeText = ({
  text,
  values,
  variables,
}: {
  text: string;
  values: TMergeVariableValues;
  variables?: TMergeVariableList;
}): MergeResult => {
  const missingVariables: string[] = [];

  const mergedText = text.replace(MERGE_VARIABLE_PATTERN, (whole, name: string) => {
    const variable = variables?.find((v) => v.name === name);
    const rawValue = values[name];

    if (rawValue === undefined || rawValue === '') {
      // required でなくても、テキストに書かれた変数は値が必要(残留防止)
      missingVariables.push(name);
      return whole;
    }

    if (variable?.type === 'number' || variable?.type === 'currency') {
      return formatNumberValue(rawValue, variable.format || (variable.type === 'currency' ? 'jpy' : undefined));
    }

    if (variable?.type === 'date' || variable?.type === 'wareki') {
      return formatDateValue(rawValue, variable.format || (variable.type === 'wareki' ? 'wareki_kanji' : undefined));
    }

    return sanitizeValue(rawValue);
  });

  if (missingVariables.length > 0) {
    return { success: false, missingVariables };
  }

  // 二重チェック: 差し込み後に残留する `{{...}}` があれば未バインド扱い
  const unbound = findUnboundVariables(mergedText);

  if (unbound.length > 0) {
    return { success: false, missingVariables: unbound };
  }

  return { success: true, mergedText };
};

/**
 * テキスト配列を一括差し込みする(フィールドの複数テキスト用)。
 */
export const mergeTexts = ({
  texts,
  values,
  variables,
}: {
  texts: string[];
  values: TMergeVariableValues;
  variables?: TMergeVariableList;
}): MergeResult | { success: true; mergedTexts: string[] } => {
  const mergedTexts: string[] = [];
  const allMissing: string[] = [];

  for (const text of texts) {
    const result = mergeText({ text, values, variables });

    if (!result.success) {
      allMissing.push(...result.missingVariables);
    } else {
      mergedTexts.push(result.mergedText);
    }
  }

  if (allMissing.length > 0) {
    return { success: false, missingVariables: [...new Set(allMissing)] };
  }

  return { success: true, mergedTexts };
};
