import { describe, expect, it } from 'vitest';

import { DateTime } from 'luxon';

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

    it('令和以前の日付は null を返す', () => {
        expect(toWareki('2019-04-30')).toBeNull();
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

    it('令和以前は false', () => {
        expect(isWarekiSupported('1989-01-08')).toBe(false);
    });
});
