import { describe, expect, it } from 'vitest';

import { mergeText, mergeTexts } from './merge';

const variables = [
  { name: '取引先名', type: 'text' as const, required: true },
  { name: '金額', type: 'number' as const, required: true, format: 'jpy' as const },
  { name: '締結日', type: 'date' as const, required: false },
];

describe('差し込みエンジン(フェーズ3 ステップ4)', () => {
  it('変数をバインドできる', () => {
    const result = mergeText({
      text: '株式会社{{取引先名}}との業務委託契約',
      values: { 取引先名: 'テスト' },
      variables,
    });

    expect(result).toEqual({ success: true, mergedText: '株式会社テストとの業務委託契約' });
  });

  it('未バインド変数を検知する(送信ブロック)', () => {
    const result = mergeText({
      text: '株式会社{{取引先名}}との契約',
      values: {},
      variables,
    });

    expect(result).toEqual({
      success: false,
      missingVariables: ['取引先名'],
    });
  });

  it('number 変数を jpy フォーマットする', () => {
    const result = mergeText({
      text: '契約金額: {{金額}}',
      values: { 金額: '1234567' },
      variables,
    });

    expect(result).toEqual({ success: true, mergedText: '契約金額: ¥1,234,567' });
  });

  it('currency 型変数を自動で jpy フォーマットする', () => {
    const result = mergeText({
      text: '報酬: {{報酬額}}',
      values: { 報酬額: '500000' },
      variables: [{ name: '報酬額', type: 'currency' as const, required: true }],
    });

    expect(result).toEqual({ success: true, mergedText: '報酬: ¥500,000' });
  });

  it('wareki 型変数を和暦変換する', () => {
    const result = mergeText({
      text: '締結日: {{契約日}}',
      values: { 契約日: '2026-10-15' },
      variables: [{ name: '契約日', type: 'wareki' as const, required: true }],
    });

    expect(result).toEqual({ success: true, mergedText: '締結日: 令和8年10月15日' });
  });

  it('値に含まれる波括弧を無効化する(ネストインジェクション対策)', () => {
    const result = mergeText({
      text: '宛先: {{取引先名}}',
      values: { 取引先名: 'テスト{{悪意ある変数}}' },
      variables,
    });

    expect(result).toEqual({ success: true, mergedText: '宛先: テスト悪意ある変数' });
  });

  it('制御文字をサニタイズする', () => {
    const result = mergeText({
      text: '宛先: {{取引先名}}',
      values: { 取引先名: 'テスト\u0000会社' },
      variables,
    });

    expect(result).toEqual({ success: true, mergedText: '宛先: テスト会社' });
  });

  it('マルチバイトをそのまま扱う', () => {
    const result = mergeText({
      text: '{{取引先名}}',
      values: { 取引先名: '株式会社日本語テスト ドメイン😀' },
      variables,
    });

    expect(result).toEqual({
      success: true,
      mergedText: '株式会社日本語テスト ドメイン😀',
    });
  });

  it('複数テキストの一括差し込みができる', () => {
    const result = mergeTexts({
      texts: ['宛先: {{取引先名}}', '金額: {{金額}}'],
      values: { 取引先名: 'テスト', 金額: '1000' },
      variables,
    });

    expect(result).toEqual({
      success: true,
      mergedTexts: ['宛先: テスト', '金額: ¥1,000'],
    });
  });

  it('複数テキストで一部未バインドなら全体を失敗扱い', () => {
    const result = mergeTexts({
      texts: ['宛先: {{取引先名}}', '日付: {{締結日}}'],
      values: { 取引先名: 'テスト' },
      variables,
    });

    expect(result).toEqual({ success: false, missingVariables: ['締結日'] });
  });
});
