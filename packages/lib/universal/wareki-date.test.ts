import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';

import { isWarekiSupported, toWareki } from './wareki-date';

describe('toWareki', () => {
  it('令和の日付を和暦表記に変換する', () => {
    expect(toWareki('2026-10-15')).toBe('令和8年10月15日');
  });

  it('令和元年(2019-05-01)を「元年」表記にする', () => {
    expect(toWareki('2019-05-01')).toBe('令和元年5月1日');
  });

  it('令和2年(2020-01-01)を正しく変換する', () => {
    expect(toWareki('2020-01-01')).toBe('令和2年1月1日');
  });

  it('平成最後の日(2019-04-30)を「平成31年4月30日」に変換する', () => {
    expect(toWareki('2019-04-30')).toBe('平成31年4月30日');
  });

  it('平成元年(1989-01-08)を「平成元年1月8日」に変換する', () => {
    expect(toWareki('1989-01-08')).toBe('平成元年1月8日');
  });

  it('昭和最後の日(1989-01-07)を「昭和64年1月7日」に変換する', () => {
    expect(toWareki('1989-01-07')).toBe('昭和64年1月7日');
  });

  it('昭和元年(1926-12-25)を「昭和元年12月25日」に変換する', () => {
    expect(toWareki('1926-12-25')).toBe('昭和元年12月25日');
  });

  it('大正最後の日(1926-12-24)を「大正15年12月24日」に変換する', () => {
    expect(toWareki('1926-12-24')).toBe('大正15年12月24日');
  });

  it('大正元年(1912-07-30)を「大正元年7月30日」に変換する', () => {
    expect(toWareki('1912-07-30')).toBe('大正元年7月30日');
  });

  it('明治45年(1912-07-29)を「明治45年7月29日」に変換する', () => {
    expect(toWareki('1912-07-29')).toBe('明治45年7月29日');
  });

  it('明治初日(1868-10-23)を「明治元年10月23日」に変換する', () => {
    expect(toWareki('1868-10-23')).toBe('明治元年10月23日');
  });

  it('明治以前(1868-10-22以前)の日付は null を返す', () => {
    expect(toWareki('1868-10-22')).toBeNull();
    expect(toWareki('1868-01-01')).toBeNull();
  });

  it('無効な日付は null を返す', () => {
    expect(toWareki('invalid-date')).toBeNull();
  });

  it('Date オブジェクトを受け付ける', () => {
    expect(toWareki(new Date('2026-10-15T00:00:00+09:00'))).toBe('令和8年10月15日');
  });

  it('Luxon DateTime を受け付ける', () => {
    expect(toWareki(DateTime.fromISO('2026-10-15', { zone: 'Asia/Tokyo' }))).toBe('令和8年10月15日');
  });
});

describe('isWarekiSupported', () => {
  it('令和以降は true', () => {
    expect(isWarekiSupported('2026-10-15')).toBe(true);
  });

  it('平成・昭和・大正・明治は true', () => {
    expect(isWarekiSupported('1989-01-08')).toBe(true);
    expect(isWarekiSupported('1926-12-25')).toBe(true);
    expect(isWarekiSupported('1912-07-30')).toBe(true);
    expect(isWarekiSupported('1868-10-23')).toBe(true);
  });

  it('明治以前は false', () => {
    expect(isWarekiSupported('1868-10-22')).toBe(false);
  });
});
