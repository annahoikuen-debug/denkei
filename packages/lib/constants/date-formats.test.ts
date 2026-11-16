import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import {
  convertToLocalSystemFormat,
  DEFAULT_DOCUMENT_DATE_FORMAT,
  isValidDateFormat,
  VALID_DATE_FORMAT_VALUES,
} from './date-formats';
import { DEFAULT_DOCUMENT_TIME_ZONE } from './time-zones';

describe('日本語日付フォーマット', () => {
  it('DEFAULT_DOCUMENT_TIME_ZONE が Asia/Tokyo に統一されている', () => {
    expect(DEFAULT_DOCUMENT_TIME_ZONE).toBe('Asia/Tokyo');
  });

  it('DEFAULT_DOCUMENT_DATE_FORMAT が yyyy年M月d日 に統一されている', () => {
    expect(DEFAULT_DOCUMENT_DATE_FORMAT).toBe('yyyy年M月d日');
  });

  it('yyyy年M月d日 が有効な dateFormat として登録されている', () => {
    expect(isValidDateFormat('yyyy年M月d日')).toBe(true);
    expect(isValidDateFormat('yyyy年M月d日 H時m分')).toBe(true);
    expect(isValidDateFormat('yyyy年M月d日 HH:mm')).toBe(true);
  });

  it('日本語フォーマットでパース→フォーマットが往復できる', () => {
    // 実行環境のタイムゾーンに依存しない(Tokyo ゾーンのまま往復する)
    const formatted = DateTime.fromObject({ year: 2026, month: 10, day: 15 }, { zone: 'Asia/Tokyo' }).toFormat(
      'yyyy年M月d日',
    );

    expect(formatted).toBe('2026年10月15日');
  });

  it('convertToLocalSystemFormat が日本語フォーマットを扱える', () => {
    const result = convertToLocalSystemFormat('2026年10月15日', 'yyyy年M月d日', 'Asia/Tokyo');

    expect(result).toBe('2026年10月15日');
  });

  it('convertToLocalSystemFormat は文書タイムゾーンを基準にする(実行環境が TZ=UTC でもずれない)', () => {
    // JST 午前0時〜9時の帯は UTC では前日になる。文書TZ基準で出力すればずれない。
    const result = convertToLocalSystemFormat('2026年10月15日 00:30', 'yyyy年M月d日 HH:mm', 'Asia/Tokyo');

    expect(result).toBe('2026年10月15日 00:30');
  });

  it('引数省略時にデフォルトタイムゾーン(Asia/Tokyo)が適用される', () => {
    const result = convertToLocalSystemFormat('2026年10月15日 00:30', 'yyyy年M月d日 HH:mm');

    expect(result).toBe('2026年10月15日 00:30');
  });

  it('不正な日付文字列の場合は Invalid date を返す', () => {
    expect(convertToLocalSystemFormat('invalid-date')).toBe('Invalid date');
  });

  it('既存フォーマットが壊れていないこと', () => {
    expect(VALID_DATE_FORMAT_VALUES).toContain('yyyy-MM-dd');
    expect(isValidDateFormat('not-a-format')).toBe(false);
  });
});
