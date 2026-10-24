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
  // Intl は JS Date を「実行環境のタイムゾーン」で解釈するため、明示的に指定する。
  // 指定しないと TZ=UTC の本番環境で日付が1日ずれる。
  timeZone: 'Asia/Tokyo',
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
    dt = date.setZone('Asia/Tokyo');
  } else if (date instanceof Date) {
    dt = DateTime.fromJSDate(date, { zone: 'Asia/Tokyo' });
  } else {
    dt = DateTime.fromISO(date, { zone: 'Asia/Tokyo' });

    if (!dt.isValid) {
      dt = DateTime.fromFormat(date, 'yyyy-MM-dd', { zone: 'Asia/Tokyo' });
    }
  }

  if (!dt.isValid) {
    return null;
  }

  const isoDate = dt.toISODate();
  if (!isoDate || isoDate < WAREKI_ERA_START) {
    return null;
  }

  const parts = WAREKI_FORMATTER.formatToParts(dt.toJSDate());

  const era = parts.find((p) => p.type === 'era')?.value ?? '';
  const rawYear = parts.find((p) => p.type === 'year')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const day = parts.find((p) => p.type === 'day')?.value ?? '';

  // Node.js / Intl は 1年目を「元」「元年」「1」などで返す可能性があるため正規化
  let yearString: string;
  if (rawYear === '元' || rawYear === '元年' || rawYear === '1') {
    yearString = '元年';
  } else {
    const yearNum = parseInt(rawYear.replace(/[^0-9]/g, ''), 10);
    if (Number.isNaN(yearNum)) {
      return null;
    }
    yearString = yearNum === 1 ? '元年' : `${yearNum}年`;
  }

  return `${era}${yearString}${month}月${day}日`;
};

/**
 * 和暦対応可否を判定する(令和以降のみ true)。
 */
export const isWarekiSupported = (date: string | Date | DateTime): boolean => {
  return toWareki(date) !== null;
};
