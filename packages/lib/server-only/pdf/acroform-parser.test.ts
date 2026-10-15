import { PDFDocument } from '@cantoo/pdf-lib';
import { describe, expect, it } from 'vitest';
import { extractAcroFormFieldsFromPDF, inferFieldTypeFromName } from './acroform-parser';

describe('inferFieldTypeFromName', () => {
  it('金額系キーワードから currency を推定する', () => {
    expect(inferFieldTypeFromName('契約金額')).toBe('currency');
    expect(inferFieldTypeFromName('monthly_fee')).toBe('currency');
    expect(inferFieldTypeFromName('単価')).toBe('currency');
  });

  it('日付系キーワードから date または wareki を推定する', () => {
    expect(inferFieldTypeFromName('契約締結日')).toBe('date');
    expect(inferFieldTypeFromName('誕生年月日')).toBe('date');
    expect(inferFieldTypeFromName('和暦年月日')).toBe('wareki');
  });

  it('数値系キーワードから number を推定する', () => {
    expect(inferFieldTypeFromName('発注数量')).toBe('number');
    expect(inferFieldTypeFromName('item_count')).toBe('number');
  });

  it('その他の名称は text を推定する', () => {
    expect(inferFieldTypeFromName('会社名')).toBe('text');
    expect(inferFieldTypeFromName('住所')).toBe('text');
  });
});

describe('extractAcroFormFieldsFromPDF', () => {
  it('AcroForm を含む PDF からフィールド情報を抽出できる', async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);

    const form = pdfDoc.getForm();
    const textField = form.createTextField('契約金額');
    textField.addToPage(page, { x: 50, y: 700, width: 200, height: 30 });

    const clientField = form.createTextField('取引先名');
    clientField.addToPage(page, { x: 50, y: 650, width: 200, height: 30 });

    const pdfBytes = await pdfDoc.save();

    const fields = await extractAcroFormFieldsFromPDF(pdfBytes);

    expect(fields.length).toBe(2);

    const amountField = fields.find((f) => f.name === '契約金額');
    expect(amountField).toBeDefined();
    expect(amountField?.type).toBe('currency');
    expect(amountField?.page).toBe(1);
    expect(amountField?.suggestedVariable.type).toBe('currency');
    expect(amountField?.suggestedVariable.format).toBe('jpy');

    const nameField = fields.find((f) => f.name === '取引先名');
    expect(nameField).toBeDefined();
    expect(nameField?.type).toBe('text');
    expect(nameField?.suggestedVariable.type).toBe('text');
  });

  it('フォームを持たない PDF でも安全に空配列を返す', async () => {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage([600, 800]);
    const pdfBytes = await pdfDoc.save();

    const fields = await extractAcroFormFieldsFromPDF(pdfBytes);
    expect(fields).toEqual([]);
  });
});
