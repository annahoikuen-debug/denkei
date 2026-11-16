import { DateTime } from 'luxon';

/**
 * 和暦(明治・大正・昭和・平成・令和)日付ユーティリティ
 *
 * `Intl.DateTimeFormat('ja-JP-u-ca-japanese')` ベースの和暦変換。
 * 明治元年(1868-10-23)以降の一世一元の制に基づく近代5元号をサポート。
 */

const WAREKI_FORMATTER = new Intl.DateTimeFormat('ja-JP-u-ca-japanese', {
  era: 'long',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  // Intl は JS Date を「実行環境のタイムゾーン」で解釈するため、明示的に指定する。
  // 指定しないと TZ=UTC の本番環境で日付が1日ずれる。
  timeZone: 'Asia/Tokyo',
});

export const SUPPORTED_ERAS = ['明治', '大正', '昭和', '平成', '令和'] as const;

/**
 * 明治改元の詔勅日(グレゴリオ暦 1868-10-23)
 * ICU / Unicode CLDR における明治の開始日
 */
const MEIJI_ERA_START = '1868-10-23';

/**
 * ISO 日付文字列(または Date)を和暦表記「元号X年M月D日」に変換する。
 * 明治・大正・昭和・平成・令和の各1年目は「元年」と表記する。
 * 明治以前(慶応以前)の日付や無効な日付は対応外として null を返す。
 *
 * @example
 * toWareki('2026-10-15'); // '令和8年10月15日'
 * toWareki('2019-05-01'); // '令和元年5月1日'
 * toWareki('1989-01-08'); // '平成元年1月8日'
 * toWareki('1926-12-25'); // '昭和元年12月25日'
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
  if (!isoDate || isoDate < MEIJI_ERA_START) {
    return null;
  }

  const parts = WAREKI_FORMATTER.formatToParts(dt.toJSDate());

  const era = parts.find((p) => p.type === 'era')?.value ?? '';
  if (!SUPPORTED_ERAS.includes(era as (typeof SUPPORTED_ERAS)[number])) {
    return null;
  }

  const rawYear = parts.find((p) => p.type === 'year')?.value ?? '';
  const rawMonth = parts.find((p) => p.type === 'month')?.value ?? '';
  const rawDay = parts.find((p) => p.type === 'day')?.value ?? '';

  const monthNum = parseInt(rawMonth.replace(/[^0-9]/g, ''), 10);
  const dayNum = parseInt(rawDay.replace(/[^0-9]/g, ''), 10);

  if (Number.isNaN(monthNum) || Number.isNaN(dayNum)) {
    return null;
  }

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

  return `${era}${yearString}${monthNum}月${dayNum}日`;
};

/**
 * 和暦対応可否を判定する(明治・大正・昭和・平成・令和の期間内であれば true)。
 */
export const isWarekiSupported = (date: string | Date | DateTime): boolean => {
  return toWareki(date) !== null;
};
