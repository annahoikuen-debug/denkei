/**
 * フェーズ1 ステップ4: 金額表示(円・3桁カンマ・税込表記)ユーティリティ
 */

const _JPY_FORMATTER = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
});

/**
 * 金額を日本円表記(半角¥ + 3桁カンマ)に整形する。
 * ICU バージョンや OS による全角￥/半角¥の差異・スペース混入を防ぎ、
 * PDF 描画・UI 描画で一貫した半角 ¥ 記号を保証する。
 *
 * @example
 * formatJpy(1234567); // '¥1,234,567'
 */
export const formatJpy = (amount: number): string => {
  if (Number.isNaN(amount)) {
    return '';
  }
  return `¥${new Intl.NumberFormat('ja-JP').format(amount)}`;
};

/**
 * 金額を「¥1,234,567(税込)」のように税込表記付きで整形する。
 *
 * @example
 * formatJpyWithTaxIncluded(1000); // '¥1,000(税込)'
 */
export const formatJpyWithTaxIncluded = (amount: number): string => {
  return `${formatJpy(amount)}(税込)`;
};

/**
 * 数値文字列をカンマ区切りの数字文字列に整形する(通貨記号なし)。
 *
 * @example
 * formatNumberJa('1234567'); // '1,234,567'
 */
export const formatNumberJa = (value: number | string): string => {
  const num = typeof value === 'string' ? Number(value) : value;

  if (Number.isNaN(num)) {
    return '';
  }

  return new Intl.NumberFormat('ja-JP').format(num);
};
