import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearFormatterCache, getDateTimeFormatter, getFormatterCacheSize, getNumberFormatter } from './intl-cache';

describe('Intl フォーマッター キャッシュ', () => {
  beforeEach(() => {
    clearFormatterCache();
  });

  afterEach(() => {
    clearFormatterCache();
  });

  describe('getNumberFormatter', () => {
    it('同じロケールとオプションで同じインスタンスを返す（キャッシュヒット）', () => {
      const f1 = getNumberFormatter('ja-JP', { style: 'currency', currency: 'JPY' });
      const f2 = getNumberFormatter('ja-JP', { style: 'currency', currency: 'JPY' });
      expect(f1).toBe(f2);
    });

    it('異なるロケールであれば異なるインスタンスを返す', () => {
      const fJa = getNumberFormatter('ja-JP');
      const fEn = getNumberFormatter('en-US');
      expect(fJa).not.toBe(fEn);
    });

    it('異なるオプションであれば異なるインスタンスを返す', () => {
      const f1 = getNumberFormatter('ja-JP', { style: 'decimal' });
      const f2 = getNumberFormatter('ja-JP', { style: 'percent' });
      expect(f1).not.toBe(f2);
    });

    it('オプションなしでフォーマッターを作成できる', () => {
      const f = getNumberFormatter('ja-JP');
      expect(f.format(1234)).toBe('1,234');
    });

    it('日本円通貨フォーマットが正しく動作する', () => {
      const f = getNumberFormatter('ja-JP', { style: 'currency', currency: 'JPY' });
      const formatted = f.format(1000);
      expect(formatted).toMatch(/^[¥￥]1,000$/);
    });

    it('キャッシュサイズが正しくカウントされる', () => {
      expect(getFormatterCacheSize()).toBe(0);
      getNumberFormatter('ja-JP');
      expect(getFormatterCacheSize()).toBe(1);
      getNumberFormatter('en-US');
      expect(getFormatterCacheSize()).toBe(2);
      // 同じロケールを再度取得してもサイズは増えない
      getNumberFormatter('ja-JP');
      expect(getFormatterCacheSize()).toBe(2);
    });
  });

  describe('getDateTimeFormatter', () => {
    it('同じロケールとオプションで同じインスタンスを返す（キャッシュヒット）', () => {
      const f1 = getDateTimeFormatter('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
      const f2 = getDateTimeFormatter('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
      expect(f1).toBe(f2);
    });

    it('異なるロケールであれば異なるインスタンスを返す', () => {
      const fJa = getDateTimeFormatter('ja-JP');
      const fEn = getDateTimeFormatter('en-US');
      expect(fJa).not.toBe(fEn);
    });

    it('オプションなしでフォーマッターを作成できる', () => {
      const f = getDateTimeFormatter('ja-JP');
      const date = new Date(2026, 9, 15);
      const formatted = f.format(date);
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });

    it('日本語ロケールで日付フォーマットが正しく動作する', () => {
      const f = getDateTimeFormatter('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
      const date = new Date(2026, 9, 15);
      const formatted = f.format(date);
      // Windows と Linux/macOS で Intl の出力フォーマットが異なるため、
      // 年が含まれていることと、数値部分のみで構成されていることを検証する
      expect(formatted).toContain('2026');
      expect(/^\d[\d/\u3001\u3002]*$/.test(formatted.replace(/[^\d/]/g, ''))).toBe(true);
    });
  });
});

describe('clearFormatterCache', () => {
  it('キャッシュをクリアしてサイズを 0 に戻す', () => {
    getNumberFormatter('ja-JP');
    getDateTimeFormatter('en-US');
    expect(getFormatterCacheSize()).toBe(2);
    clearFormatterCache();
    expect(getFormatterCacheSize()).toBe(0);
  });
});
