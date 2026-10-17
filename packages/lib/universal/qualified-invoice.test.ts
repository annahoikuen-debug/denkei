import { describe, expect, it } from 'vitest';

import {
  calculateConsumptionTax,
  generateQualifiedInvoiceHtml,
  isValidInvoiceRegistrationNumber,
} from './qualified-invoice';

describe('適格請求書(インボイス制度) ユーティリティ', () => {
  describe('事業者登録番号の検証 (T+13桁)', () => {
    it('正常な登録番号を合格とする', () => {
      expect(isValidInvoiceRegistrationNumber('T1010001999999')).toBe(true);
      expect(isValidInvoiceRegistrationNumber('t1234567890123 ')).toBe(true);
    });

    it('不正な形式を不合格とする', () => {
      expect(isValidInvoiceRegistrationNumber('1010001999999')).toBe(false); // Tなし
      expect(isValidInvoiceRegistrationNumber('T123456789012')).toBe(false); // 12桁
      expect(isValidInvoiceRegistrationNumber('T12345678901234')).toBe(false); // 14桁
      expect(isValidInvoiceRegistrationNumber('T123456789012A')).toBe(false); // 英字混入
      expect(isValidInvoiceRegistrationNumber('')).toBe(false);
    });
  });

  describe('消費税(10%)・税抜・税込計算', () => {
    it('Standardプラン ¥2,980 の端数処理が正しい', () => {
      const breakdown = calculateConsumptionTax(2980);

      expect(breakdown.grossAmountJpy).toBe(2980);
      expect(breakdown.taxAmountJpy).toBe(271);
      expect(breakdown.netAmountJpy).toBe(2709);
      expect(breakdown.netAmountJpy + breakdown.taxAmountJpy).toBe(2980);
      expect(breakdown.taxRatePercent).toBe(10);
    });

    it('Businessプラン ¥4,980 の端数処理が正しい', () => {
      const breakdown = calculateConsumptionTax(4980);

      expect(breakdown.grossAmountJpy).toBe(4980);
      expect(breakdown.taxAmountJpy).toBe(453);
      expect(breakdown.netAmountJpy).toBe(4527);
      expect(breakdown.netAmountJpy + breakdown.taxAmountJpy).toBe(4980);
    });

    it('年払い一括 Standardプラン ¥29,760 の端数処理が正しい (実質2ヶ月無料)', () => {
      const breakdown = calculateConsumptionTax(29760);

      expect(breakdown.grossAmountJpy).toBe(29760);
      expect(breakdown.taxAmountJpy).toBe(2705);
      expect(breakdown.netAmountJpy).toBe(27055);
      expect(breakdown.netAmountJpy + breakdown.taxAmountJpy).toBe(29760);
    });

    it('年払い一括 Businessプラン ¥49,800 の端数処理が正しい', () => {
      const breakdown = calculateConsumptionTax(49800);

      expect(breakdown.grossAmountJpy).toBe(49800);
      expect(breakdown.taxAmountJpy).toBe(4527);
      expect(breakdown.netAmountJpy).toBe(45273);
      expect(breakdown.netAmountJpy + breakdown.taxAmountJpy).toBe(49800);
    });
  });

  describe('適格請求書HTML生成', () => {
    it('要件を満たすインボイスHTMLを出力する', () => {
      const html = generateQualifiedInvoiceHtml({
        invoiceId: 'INV-202610-001',
        issueDate: '2026-10-16',
        billingPeriod: '2026年10月度',
        customerName: '合同会社サンプル',
        itemName: 'デンケイ スタンダードプラン月額利用料 (月100件枠)',
        amountJpy: 2980,
      });

      expect(html).toContain('適 格 請 求 書');
      expect(html).toContain('INV-202610-001');
      expect(html).toContain('合同会社サンプル');
      expect(html).toContain('登録番号: T1010001999999');
      expect(html).toContain('¥2,980');
      expect(html).toContain('¥271');
      expect(html).toContain('¥2,709');
      expect(html).toContain('消費税法第57条の4準拠');
    });

    it('年払い一括用の適格請求書兼領収書HTMLが正しく出力される', async () => {
      const { generateAnnualQualifiedInvoiceHtml } = await import('./qualified-invoice');

      const html = generateAnnualQualifiedInvoiceHtml({
        invoiceId: 'INV-ANNUAL-2026-001',
        issueDate: '2026-10-17',
        annualPeriod: '2026年10月〜2027年9月',
        customerName: '株式会社テスト商事',
        planId: 'STANDARD',
        isReceipt: true,
      });

      expect(html).toContain('適格請求書 兼 領収書');
      expect(html).toContain('INV-ANNUAL-2026-001');
      expect(html).toContain('株式会社テスト商事');
      expect(html).toContain('¥29,760');
      expect(html).toContain('¥2,705');
      expect(html).toContain('¥27,055');
      expect(html).toContain('実質2ヶ月無料');
      expect(html).toContain('年間1,200件枠');
    });
  });
});
