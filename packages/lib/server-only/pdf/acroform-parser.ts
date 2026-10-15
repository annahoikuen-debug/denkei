import { PDFCheckBox, PDFDocument, PDFDropdown, PDFRadioGroup, PDFTextField } from '@cantoo/pdf-lib';
import type { TMergeVariable } from '@documenso/lib/types/merge-variables';

/**
 * フェーズ3 ステップ5: PDFフォーム(AcroForm)解析ユーティリティ
 *
 * アップロードされた PDF に含まれる既存の AcroForm(フォームフィールド/Widget注釈)
 * を解析し、フィールド名・座標・ページ・推定される型を抽出する。
 */

export type DetectedAcroFormField = {
  name: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'checkbox' | 'dropdown' | 'radio';
  page: number; // 1-indexed
  x: number; // pt (top-left origin)
  y: number; // pt (top-left origin)
  width: number; // pt
  height: number; // pt
  suggestedVariable: TMergeVariable;
};

/**
 * フィールド名から型を推測するヒューリスティック関数
 */
export const inferFieldTypeFromName = (fieldName: string): 'text' | 'number' | 'date' | 'currency' | 'wareki' => {
  const lower = fieldName.toLowerCase();

  // 金額系
  if (/金額|報酬|賃料|単価|費用|価格|料金|代金|amount|price|fee|cost|currency|yen|jpy/.test(lower)) {
    return 'currency';
  }

  // 和暦系
  if (/和暦|元号|令和/.test(lower)) {
    return 'wareki';
  }

  // 日付系
  if (/日付|年月日|期日|締結日|発行日|生年月日|date|day|time/.test(lower)) {
    return 'date';
  }

  // 数値系
  if (/個数|数量|番号|人数|回数|count|num|quantity|rate/.test(lower)) {
    return 'number';
  }

  return 'text';
};

/**
 * PDF バッファから AcroForm フィールドを抽出する
 */
export const extractAcroFormFieldsFromPDF = async (pdfBytes: Uint8Array | Buffer): Promise<DetectedAcroFormField[]> => {
  const detected: DetectedAcroFormField[] = [];

  try {
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    const pages = pdfDoc.getPages();

    for (const field of fields) {
      const fieldName = field.getName();
      if (!fieldName) {
        continue;
      }

      const widgets = field.acroField.getWidgets();

      for (const widget of widgets) {
        // ウィジェットが配置されているページを特定
        const pRef = widget.P();

        let pageIndex = -1;
        if (pRef) {
          pageIndex = pages.findIndex((page) => page.ref === pRef);
        }

        // P参照がない場合は各ページの Annots を走査
        if (pageIndex === -1) {
          for (let i = 0; i < pages.length; i++) {
            const pageAnnots = pages[i].node.Annots();
            if (pageAnnots) {
              const array = pageAnnots.asArray();
              if (array.some((ref) => ref === widget.dict || ref === pRef)) {
                pageIndex = i;
                break;
              }
            }
          }
        }

        if (pageIndex === -1) {
          pageIndex = 0; // fallback to page 1
        }

        const page = pages[pageIndex];
        const pageHeight = page.getHeight();
        const rect = widget.getRectangle();

        // PDF の bottom-left 原点から top-left 原点へ変換
        const x = rect.x;
        const width = rect.width;
        const height = rect.height;
        const y = pageHeight - rect.y - rect.height;

        let fieldType: DetectedAcroFormField['type'] = 'text';

        if (field instanceof PDFCheckBox) {
          fieldType = 'checkbox';
        } else if (field instanceof PDFDropdown) {
          fieldType = 'dropdown';
        } else if (field instanceof PDFRadioGroup) {
          fieldType = 'radio';
        } else if (field instanceof PDFTextField) {
          const inferred = inferFieldTypeFromName(fieldName);
          if (inferred === 'currency') {
            fieldType = 'currency';
          } else if (inferred === 'date' || inferred === 'wareki') {
            fieldType = 'date';
          } else if (inferred === 'number') {
            fieldType = 'number';
          } else {
            fieldType = 'text';
          }
        }

        const inferredVarType = inferFieldTypeFromName(fieldName);

        detected.push({
          name: fieldName,
          type: fieldType,
          page: pageIndex + 1,
          x: Math.round(x * 100) / 100,
          y: Math.round(y * 100) / 100,
          width: Math.round(width * 100) / 100,
          height: Math.round(height * 100) / 100,
          suggestedVariable: {
            name: fieldName.replace(/[\s{}]/g, '_'),
            label: fieldName,
            type: inferredVarType,
            required: false,
            format: inferredVarType === 'currency' ? 'jpy' : inferredVarType === 'wareki' ? 'wareki_kanji' : undefined,
          },
        });
      }
    }
  } catch (error) {
    console.warn('Failed to parse AcroForm from PDF:', error);
  }

  return detected;
};
