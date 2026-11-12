import { describe, expect, it } from 'vitest';
import { formatJpy, formatJpyWithTaxIncluded, formatNumberJa } from './format-currency';

describe('formatJpy', () => {
  it('正の整数を半角¥ + 3桁カンマ付きで整形する', () => {
    expect(formatJpy(1234567)).toBe('¥1,234,567');
    expect(formatJpy(100)).toBe('¥100');
  });

  it('0 を正しく ¥0 と整形する', () => {
    expect(formatJpy(0)).toBe('¥0');
  });

  it('負数を -¥ 形式で整形する(¥-1,000 とならない)', () => {
    expect(formatJpy(-1000)).toBe('-¥1,000');
    expect(formatJpy(-50000)).toBe('-¥50,000');
  });

  it('小数を正しく丸めて整形する', () => {
    expect(formatJpy(1234.56)).toBe('¥1,235');
  });

  it('無効な値（NaN, Infinity, null, undefined）に対して空文字列を返す', () => {
    expect(formatJpy(Number.NaN)).toBe('');
    expect(formatJpy(Number.POSITIVE_INFINITY)).toBe('');
    expect(formatJpy(Number.NEGATIVE_INFINITY)).toBe('');
    expect(formatJpy(null as any)).toBe('');
    expect(formatJpy(undefined as any)).toBe('');
  });
});

describe('formatJpyWithTaxIncluded', () => {
  it('税込表記が付与される', () => {
    expect(formatJpyWithTaxIncluded(1000)).toBe('¥1,000(税込)');
    expect(formatJpyWithTaxIncluded(-1000)).toBe('-¥1,000(税込)');
    expect(formatJpyWithTaxIncluded(0)).toBe('¥0(税込)');
  });

  it('無効な値の場合は空文字列を返す', () => {
    expect(formatJpyWithTaxIncluded(null as any)).toBe('');
    expect(formatJpyWithTaxIncluded(undefined as any)).toBe('');
    expect(formatJpyWithTaxIncluded(Number.NaN)).toBe('');
  });
});

describe('formatNumberJa', () => {
  it('数値入力を3桁カンマ区切りにする', () => {
    expect(formatNumberJa(1234567)).toBe('1,234,567');
    expect(formatNumberJa(0)).toBe('0');
    expect(formatNumberJa(-12345)).toBe('-12,345');
  });

  it('数値文字列入力を3桁カンマ区切りにする', () => {
    expect(formatNumberJa('1234567')).toBe('1,234,567');
    expect(formatNumberJa('0')).toBe('0');
    expect(formatNumberJa('  5000  ')).toBe('5,000');
  });

  it('空文字列に対して 0 ではなく空文字列を返す（エッジケース回帰防止）', () => {
    expect(formatNumberJa('')).toBe('');
    expect(formatNumberJa('   ')).toBe('');
  });

  it('null / undefined に対して空文字列を返す', () => {
    expect(formatNumberJa(null)).toBe('');
    expect(formatNumberJa(undefined)).toBe('');
  });

  it('非数値文字列に対して空文字列を返す', () => {
    expect(formatNumberJa('abc')).toBe('');
    expect(formatNumberJa('12a34')).toBe('');
  });
});
