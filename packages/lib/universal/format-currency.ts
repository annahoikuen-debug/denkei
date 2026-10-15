/**
 * フェーズ1 ステップ4: 金額表示(円・3桁カンマ・税込表記)ユーティリティ
 */

const JPY_FORMATTER = new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
});

/**
 * 金額を日本円表記(3桁カンマ + 円)に整形する。
 *
 * @example
 * formatJpy(1234567); // '￥1,234,567'
 */
export const formatJpy = (amount: number): string => {
    return JPY_FORMATTER.format(amount);
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
