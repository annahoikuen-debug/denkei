/**
 * 共通 Intl フォーマッター キャッシュユーティリティ
 *
 * Intl.NumberFormat および Intl.DateTimeFormat インスタンスを
 * ロケール + オプションでキー化してキャッシュし、
 * インスタンス化コストを削減する。
 *
 * モジュールレベルの Map で管理し、同じロケール・オプションの
 * フォーマッターは 2 回目以降キャッシュから返される。
 */

const formatterCache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();

const buildKey = (
  locale: string,
  options?: Intl.NumberFormatOptions | Intl.DateTimeFormatOptions | undefined,
): string => {
  return `${locale}:${JSON.stringify(options ?? {})}`;
};

/**
 * キャッシュ済みの Intl.NumberFormat インスタンスを取得する。
 * 同一キーのインスタンスが存在しない場合は新規作成してキャッシュに登録する。
 */
export const getNumberFormatter = (locale: string, options?: Intl.NumberFormatOptions): Intl.NumberFormat => {
  const key = buildKey(locale, options);
  let formatter = formatterCache.get(key) as Intl.NumberFormat | undefined;
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options);
    formatterCache.set(key, formatter);
  }
  return formatter;
};

/**
 * キャッシュ済みの Intl.DateTimeFormat インスタンスを取得する。
 * 同一キーのインスタンスが存在しない場合は新規作成してキャッシュに登録する。
 */
export const getDateTimeFormatter = (locale: string, options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat => {
  const key = buildKey(locale, options);
  let formatter = formatterCache.get(key) as Intl.DateTimeFormat | undefined;
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    formatterCache.set(key, formatter);
  }
  return formatter;
};

/**
 * キャッシュをクリアする（主にテスト用）。
 */
export const clearFormatterCache = (): void => {
  formatterCache.clear();
};

/**
 * 現在キャッシュされているエントリ数を返す（主にテスト用）。
 */
export const getFormatterCacheSize = (): number => {
  return formatterCache.size;
};
