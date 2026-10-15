import { z } from 'zod';

/**
 * フェーズ3 ステップ2: 差し込み変数(マージ変数)スキーマ
 *
 * `{{取引先名}}` 等の変数をテンプレートレベルで定義し、
 * テキストフィールド・フィールドラベルに差し込む。
 *
 * 変数定義リスト(名前/型/必須)はテンプレートごとに保持する。
 */

/** 変数の型 */
export const ZMergeVariableTypeSchema = z.enum(['text', 'number', 'date', 'currency', 'wareki']);

export type TMergeVariableType = z.infer<typeof ZMergeVariableTypeSchema>;

/**
 * テンプレートレベルの変数定義。
 */
export const ZMergeVariableSchema = z
  .object({
    /** 変数名(ja ラベル可)。差し込み記法は `{{name}}` */
    name: z
      .string()
      .trim()
      .min(1, '変数名を入力してください')
      .max(100, '変数名は100文字以内で入力してください')
      .regex(/^[^\s{}]+$/, '変数名に空白や波括弧は使用できません'),
    label: z.string().trim().max(200).optional(),
    type: ZMergeVariableTypeSchema,
    required: z.boolean().default(false),
    /** 表示フォーマット(カンマ区切り、円記号、和暦など) */
    format: z.enum(['plain', 'comma', 'jpy', 'wareki_kanji', 'wareki_short']).optional(),
  })
  .refine(
    (data) => {
      // number または currency のみ comma / jpy を許容
      if (data.format && ['comma', 'jpy'].includes(data.format)) {
        return data.type === 'number' || data.type === 'currency';
      }

      // date または wareki のみ wareki_* を許容
      if (data.format && ['wareki_kanji', 'wareki_short'].includes(data.format)) {
        return data.type === 'date' || data.type === 'wareki';
      }

      return true;
    },
    { message: '指定された format はこの変数の type では利用できません' },
  );

export type TMergeVariable = z.infer<typeof ZMergeVariableSchema>;

/**
 * 変数定義リスト(テンプレートに保存)。
 * 変数名の重複を検知する。
 */
export const ZMergeVariableListSchema = z
  .array(ZMergeVariableSchema)
  .max(100, '変数は100個までです')
  .refine(
    (variables) => {
      const names = variables.map((v) => v.name);

      return new Set(names).size === names.length;
    },
    { message: '変数名が重複しています' },
  );

export type TMergeVariableList = z.infer<typeof ZMergeVariableListSchema>;

/**
 * 差し込み時にバインドする値のマップ。
 */
export const ZMergeVariableValuesSchema = z.record(z.string(), z.string().max(10_000));

export type TMergeVariableValues = z.infer<typeof ZMergeVariableValuesSchema>;

/** 差し込み記法の正規表現(`{{...}}`) */
export const MERGE_VARIABLE_PATTERN = /\{\{\s*([^{}]+?)\s*\}\}/g;

/**
 * テキスト中で参照されている変数名を抽出する。
 */
export const extractReferencedVariableNames = (text: string): string[] => {
  const names: string[] = [];

  for (const match of text.matchAll(MERGE_VARIABLE_PATTERN)) {
    names.push(match[1]);
  }

  return names;
};

/**
 * テキスト中の参照がすべて定義済み変数かを検証する。
 * 未定義参照を返す(空なら OK)。
 */
export const findUndefinedReferences = (text: string, definedVariables: TMergeVariableList): string[] => {
  const definedNames = new Set(definedVariables.map((v) => v.name));

  return extractReferencedVariableNames(text).filter((name) => !definedNames.has(name));
};

/**
 * 差し込み後のテキストに未バインド変数(`{{...}}` 残留)がないか検証する。
 */
export const findUnboundVariables = (mergedText: string): string[] => {
  return extractReferencedVariableNames(mergedText);
};
