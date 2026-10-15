import { DateTime } from 'luxon';

/**
 * フェーズ1 ステップ12: 和暦(令和)日付ユーティリティ
 *
 * `Intl.DateTimeFormat('ja-JP-u-ca-japanese')` ベースの和暦変換。
 * 令和元年(2019-05-01)以降をサポート。
 */

const WAREKI_FORMATTER = new Intl.DateTimeFormat('ja-JP-u-ca-japanese', {
    era: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
});

const WAREKI_ERA_START = '2019-05-01';

/**
 * ISO 日付文字列(または Date)を和暦表記「令和X年M月D日」に変換する。
 * 令和以前の日付は対応外として null を返す。
 *
 * @example
 * toWareki('2026-10-15'); // '令和8年10月15日'
 * toWareki('2019-05-01'); // '令和元年5月1日'
 */
export const toWareki = (date: string | Date | DateTime): string | null => {
    let dt: DateTime;

    if (date instanceof DateTime) {
        dt = date;
    } else if (date instanceof Date) {
        dt = DateTime.fromJSDate(date);
    } else {
        dt = DateTime.fromISO(date);

        if (!dt.isValid) {
            dt = DateTime.fromFormat(date, 'yyyy-MM-dd', { zone: 'Asia/Tokyo' });
        }
    }

    if (!dt.isValid) {
        return null;
    }

    if (dt.toISODate()! < WAREKI_ERA_START) {
        return null;
    }

    const parts = WAREKI_FORMATTER.formatToParts(dt.toJSDate());

    const era = parts.find((p) => p.type === 'era')?.value ?? '';
    let year = parts.find((p) => p.type === 'year')?.value ?? '';
    const month = parts.find((p) => p.type === 'month')?.value ?? '';
    const day = parts.find((p) => p.type === 'day')?.value ?? '';

    // Node.js/Intl では 1年目を「元」または「1」と返す
    if (year === '元' || year === '元年' || year === '1') {
        year = '元年';
    } else {
        const yearNum = parseInt(year, 10);
        if (Number.isNaN(yearNum)) {
            return null;
        }
        year = yearNum === 1 ? '元年' : `${yearNum}年`;
    }

    // year に既に「年」が含まれている場合は重複させない
    const yearString = year.endsWith('年') ? year : `${year}年`;

    return `${era}${yearString}${month}月${day}日`;
};

/**
 * 和暦対応可否を判定する(令和以降のみ true)。
 */
export const isWarekiSupported = (date: string | Date | DateTime): boolean => {
    return toWareki(date) !== null;
};
