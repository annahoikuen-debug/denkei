import { describe, expect, it } from 'vitest';

import { joinJapaneseName, splitJapaneseName } from './japanese-name';

describe('joinJapaneseName', () => {
    it('姓/名を「姓 名」順で結合する', () => {
        expect(joinJapaneseName({ sei: '田中', mei: '太郎' })).toBe('田中 太郎');
    });

    it('姓が空の場合は名のみ返す', () => {
        expect(joinJapaneseName({ sei: '', mei: '太郎' })).toBe('太郎');
    });

    it('名が空の場合は姓のみ返す', () => {
        expect(joinJapaneseName({ sei: '田中', mei: '' })).toBe('田中');
    });

    it('前後の空白をトリムする', () => {
        expect(joinJapaneseName({ sei: ' 田中 ', mei: ' 太郎 ' })).toBe('田中 太郎');
    });
});

describe('splitJapaneseName', () => {
    it('「姓 名」を分割する', () => {
        expect(splitJapaneseName('田中 太郎')).toEqual({ sei: '田中', mei: '太郎' });
    });

    it('スペースが無い場合は全体を姓として扱う', () => {
        expect(splitJapaneseName('田中太郎')).toEqual({ sei: '田中太郎', mei: '' });
    });
});
