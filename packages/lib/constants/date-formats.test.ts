import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import { formatJpy, formatJpyWithTaxIncluded, formatNumberJa } from '../universal/format-currency';
import { convertToLocalSystemFormat, isValidDateFormat, VALID_DATE_FORMAT_VALUES } from './date-formats';

describe('日本語日付フォーマット', () => {
  it('yyyy年M月d日 が有効な dateFormat として登録されている', () => {
    expect(isValidDateFormat('yyyy年M月d日')).toBe(true);
    expect(isValidDateFormat('yyyy年M月d日 H時m分')).toBe(true);
    expect(isValidDateFormat('yyyy年M月d日 HH:mm')).toBe(true);
  });

  it('日本語フォーマットでパース→フォーマットが往復できる', () => {
    const formatted = DateTime.fromObject({ year: 2026, month: 10, day: 15 }, { zone: 'Asia/Tokyo' })
      .toLocal()
      .toFormat('yyyy年M月d日');

    expect(formatted).toBe('2026年10月15日');
  });

  it('convertToLocalSystemFormat が日本語フォーマットを扱える', () => {
    const result = convertToLocalSystemFormat('2026年10月15日', 'yyyy年M月d日', 'Asia/Tokyo');

    expect(result).toBe('2026年10月15日');
  });

  it('既存フォーマットが壊れていないこと', () => {
    expect(VALID_DATE_FORMAT_VALUES).toContain('yyyy-MM-dd');
    expect(isValidDateFormat('not-a-format')).toBe(false);
  });
});

describe('日本円フォーマット', () => {
  it('3桁カンマ付き円表記になる', () => {
    expect(formatJpy(1234567)).toMatch(/1,234,567/);
    expect(formatJpy(0)).toMatch(/0/);
  });

  it('税込表記を付与できる', () => {
    expect(formatJpyWithTaxIncluded(1000)).toMatch(/1,000/);
    expect(formatJpyWithTaxIncluded(1000)).toContain('(税込)');
  });

  it('数値のカンマ区切り(通貨記号なし)', () => {
    expect(formatNumberJa(1234567)).toBe('1,234,567');
    expect(formatNumberJa('9876543')).toBe('9,876,543');
    expect(formatNumberJa('invalid')).toBe('');
  });
});
