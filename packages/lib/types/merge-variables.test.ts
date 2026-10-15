import { describe, expect, it } from 'vitest';

import {
    extractReferencedVariableNames,
    findUndefinedReferences,
    findUnboundVariables,
    ZMergeVariableListSchema,
    ZMergeVariableSchema,
    ZMergeVariableValuesSchema,
} from './merge-variables';

describe('差し込み変数スキーマ(フェーズ3 ステップ2)', () => {
    it('正常な変数定義をパースできる', () => {
        const result = ZMergeVariableSchema.safeParse({
            name: '取引先名',
            type: 'text',
            required: true,
        });

        expect(result.success).toBe(true);
    });

    it('変数名に波括弧や空白は使用できない', () => {
        expect(
            ZMergeVariableSchema.safeParse({ name: 'a b', type: 'text' }).success,
        ).toBe(false);

        expect(
            ZMergeVariableSchema.safeParse({ name: 'a{b}', type: 'text' }).success,
        ).toBe(false);
    });

    it('number/currency 型でない変数に jpy format は指定できない', () => {
        expect(
            ZMergeVariableSchema.safeParse({ name: 'x', type: 'text', format: 'jpy' }).success,
        ).toBe(false);

        expect(
            ZMergeVariableSchema.safeParse({ name: 'x', type: 'number', format: 'jpy' }).success,
        ).toBe(true);

        expect(
            ZMergeVariableSchema.safeParse({ name: 'x', type: 'currency', format: 'jpy' }).success,
        ).toBe(true);
    });

    it('date/wareki 型で wareki format を指定できる', () => {
        expect(
            ZMergeVariableSchema.safeParse({ name: '契約日', type: 'date', format: 'wareki_kanji' }).success,
        ).toBe(true);

        expect(
            ZMergeVariableSchema.safeParse({ name: '契約日', type: 'wareki', format: 'wareki_kanji' }).success,
        ).toBe(true);

        expect(
            ZMergeVariableSchema.safeParse({ name: '契約日', type: 'text', format: 'wareki_kanji' }).success,
        ).toBe(false);
    });

    it('変数名の重複を検知する', () => {
        const result = ZMergeVariableListSchema.safeParse([
            { name: '取引先名', type: 'text', required: true },
            { name: '取引先名', type: 'text', required: false },
        ]);

        expect(result.success).toBe(false);
    });

    it('重複しないリストはパースできる', () => {
        const result = ZMergeVariableListSchema.safeParse([
            { name: '取引先名', type: 'text', required: true },
            { name: '金額', type: 'number', required: true, format: 'jpy' },
        ]);

        expect(result.success).toBe(true);
    });
});

describe('変数参照の抽出', () => {
    it('テキストから参照変数を抽出する', () => {
        expect(
            extractReferencedVariableNames('株式会社{{取引先名}}との{{契約種別}}契約'),
        ).toEqual(['取引先名', '契約種別']);
    });

    it('参照なしテキストは空配列', () => {
        expect(extractReferencedVariableNames('変数なし')).toEqual([]);
    });
});

describe('未定義参照の検知', () => {
    it('定義済みのみなら空配列', () => {
        expect(
            findUndefinedReferences('{{取引先名}}様', [
                { name: '取引先名', type: 'text', required: true },
            ]),
        ).toEqual([]);
    });

    it('未定義参照を返す', () => {
        expect(
            findUndefinedReferences('{{取引先名}}と{{未定義変数}}', [
                { name: '取引先名', type: 'text', required: true },
            ]),
        ).toEqual(['未定義変数']);
    });
});

describe('未バインド変数の検知', () => {
    it('差し込み後の残留 `{{...}}` を検出する', () => {
        expect(findUnboundVariables('株式会社◯◯(未差し込み {{取引先名}})')).toEqual([
            '取引先名',
        ]);
    });

    it('差し込み済みなら空配列', () => {
        expect(findUnboundVariables('株式会社テスト(差し込み済み)')).toEqual([]);
    });
});

describe('バインド値マップ', () => {
    it('文字列値のみ受け付ける', () => {
        expect(
            ZMergeVariableValuesSchema.safeParse({ 取引先名: '株式会社テスト', 金額: '1234567' }).success,
        ).toBe(true);

        expect(ZMergeVariableValuesSchema.safeParse({ x: 123 }).success).toBe(false);
    });
});
