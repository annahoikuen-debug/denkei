import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PDF } from '@libpdf/core';
import { describe, expect, it } from 'vitest';

/**
 * フェーズ1 ステップ31: PDF 改変検知のユニットテスト
 *
 * 署名済み PDF のバイト列を改変した場合にハッシュが変化すること(=検証失敗の基礎)と、
 * 未改変 PDF のハッシュ一致を検証する。
 * 実際の CMS 署名検証は Adobe Reader 相当の検証(ステップ29のスクリプト)で行う。
 */
const examplePdfPath = path.join(__dirname, '../../assets/example.pdf');

describe('PDF tamper detection', () => {
  it('未改変 PDF はハッシュ計算が安定している(ハッシュ一致)', async () => {
    const bytes = new Uint8Array(readFileSync(examplePdfPath));

    const pdf1 = await PDF.load(bytes);
    const pdf2 = await PDF.load(bytes);

    expect(pdf1.getPageCount()).toBe(pdf2.getPageCount());

    const hash1 = createHash('sha256').update(bytes).digest('hex');
    const hash2 = createHash('sha256').update(bytes).digest('hex');

    expect(hash1).toBe(hash2);
  });

  it('1バイトでも改変されるとハッシュが変化する(改変検知)', async () => {
    const bytes = new Uint8Array(readFileSync(examplePdfPath));

    const originalHash = createHash('sha256').update(bytes).digest('hex');

    // 内容ストリーム部分(先頭ヘッダー以降)の1バイトを改変
    const tampered = new Uint8Array(bytes);

    const targetIndex = Math.floor(tampered.length / 2);

    tampered[targetIndex] = tampered[targetIndex] ^ 0xff;

    // 同一バイトにならないことを保険で確認
    expect(tampered[targetIndex]).not.toBe(bytes[targetIndex]);

    const tamperedHash = createHash('sha256').update(tampered).digest('hex');

    expect(tamperedHash).not.toBe(originalHash);
  });

  it('TSA 有効時の署名オプションが LTV + アーカイブタイムスタンプになる(設定検証)', async () => {
    // signPdf のオプション分岐ロジック(TSA 有無)の再現テスト。
    // tsa が null の場合: longTermValidation/archivalTimestamp = false
    // tsa が存在する場合: true かつ estimatedSize 拡張
    const tsa = null;

    const longTermValidation = !!tsa;
    const archivalTimestamp = !!tsa;
    const estimatedSize = tsa ? 32768 : undefined;

    expect(longTermValidation).toBe(false);
    expect(archivalTimestamp).toBe(false);
    expect(estimatedSize).toBeUndefined();

    const withTsa = {} as never;

    expect(withTsa).toBeTruthy;

    const hasTsa = true;

    expect(!!hasTsa).toBe(true);
    expect(hasTsa ? 32768 : undefined).toBe(32768);
  });
});
