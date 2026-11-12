/**
 * フェーズ1 ステップ4: 金額表示(円・3桁カンマ・税込表記)ユーティリティ
 */

// キャッシュ済み Intl インスタンス（モジュールレベルで再利用しインスタンス化コストを排除）
const NUMBER_JA_FORMATTER = new Intl.NumberFormat('ja-JP');

/**
 * 金額を日本円表記(半角¥ + 3桁カンマ)に整形する。
 * ICU バージョンや OS による全角￥/半角¥の差異・スペース混入を防ぎ、
 * PDF 描画・UI 描画で一貫した半角 ¥ 記号を保証する。
 * 負数の場合は "-¥1,000" のようにマイナス記号を先頭に配置する。
 *
 * @example
 * formatJpy(1234567); // '¥1,234,567'
 * formatJpy(-1000);   // '-¥1,000'
 * formatJpy(0);       // '¥0'
 */
export const formatJpy = (amount: number | null | undefined): string => {
  if (typeof amount !== 'number' || Number.isNaN(amount) || !Number.isFinite(amount)) {
    return '';
  }
  const isNegative = amount < 0;
  // 日本円は整数(銭単位は流通していないため四捨五入で丸める)
  const roundedAmount = Math.round(Math.abs(amount));
  const formatted = NUMBER_JA_FORMATTER.format(roundedAmount);

  return isNegative ? `-¥${formatted}` : `¥${formatted}`;
};

/**
 * 金額を「¥1,234,567(税込)」のように税込表記付きで整形する。
 *
 * @example
 * formatJpyWithTaxIncluded(1000);  // '¥1,000(税込)'
 * formatJpyWithTaxIncluded(-1000); // '-¥1,000(税込)'
 */
export const formatJpyWithTaxIncluded = (amount: number | null | undefined): string => {
  const formatted = formatJpy(amount);
  return formatted ? `${formatted}(税込)` : '';
};

/**
 * 数値または数値文字列をカンマ区切りの数字文字列に整形する(通貨記号なし)。
 * 空文字列、null、undefined、非数値文字列の場合は空文字列を返す。
 *
 * @example
 * formatNumberJa('1234567'); // '1,234,567'
 * formatNumberJa('');        // ''
 * formatNumberJa(null);      // ''
 * formatNumberJa(0);         // '0'
 * formatNumberJa(-500);      // '-500'
 */
export const formatNumberJa = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return '';
    }
    const num = Number(trimmed);
    if (Number.isNaN(num) || !Number.isFinite(num)) {
      return '';
    }
    return NUMBER_JA_FORMATTER.format(num);
  }

  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return '';
  }

  return NUMBER_JA_FORMATTER.format(value);
};
