/**
 * フェーズ1 ステップ11: 氏名・住所入力の日本式対応
 *
 * 姓(sei)/名(mei)の分離入力を結合し、「姓 名」順(半角スペース区切り)で
 * PDF 上の NAME フィールドに描画される文字列を生成する。
 */
export type JapaneseNameParts = {
    sei: string;
    mei: string;
};

/**
 * 姓/名を「姓 名」順に結合する。
 * 空の側はスキップし、結合結果をトリムする。
 *
 * @example
 * joinJapaneseName({ sei: '田中', mei: '太郎' }); // '田中 太郎'
 * joinJapaneseName({ sei: '', mei: '太郎' }); // '太郎'
 */
export const joinJapaneseName = ({ sei, mei }: JapaneseNameParts): string => {
    return `${sei.trim()} ${mei.trim()}`.replace(/\s+/g, ' ').trim();
};

/**
 * 「姓 名」形式の氏名文字列を姓/名に分割する(簡易逆変換)。
 * スペースが無い場合は全体を姓として扱う。
 *
 * @example
 * splitJapaneseName('田中 太郎'); // { sei: '田中', mei: '太郎' }
 */
export const splitJapaneseName = (fullName: string): JapaneseNameParts => {
    const trimmed = fullName.trim();

    const spaceIndex = trimmed.indexOf(' ');

    if (spaceIndex === -1) {
        return { sei: trimmed, mei: '' };
    }

    return {
        sei: trimmed.slice(0, spaceIndex).trim(),
        mei: trimmed.slice(spaceIndex + 1).trim(),
    };
};
