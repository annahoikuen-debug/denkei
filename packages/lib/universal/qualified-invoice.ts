/**
 * 日本のインボイス制度(適格請求書等保存方式)対応ユーティリティ
 *
 * 登録番号: T + 13桁の法人番号/識別番号
 * 消費税率: 10% (標準税率)
 * 記載要件:
 * 1. 発行者の氏名又は名称及び登録番号 (Txxxxxxxxxxxxx)
 * 2. 取引年月日
 * 3. 取引内容(軽減税率の対象である旨の表記: 当サービスは10%標準税率のみ)
 * 4. 税率ごとに区分して合計した対価の額(税抜/税込)及び適用税率
 * 5. 税率ごとに区分した消費税額等
 * 6. 書類の交付を受ける事業者の氏名又は名称
 */

export const INVOICE_REGISTRATION_NUMBER_REGEX = /^T\d{13}$/;

/**
 * 適格請求書発行事業者登録番号の検証 (T + 13桁数字)
 */
export const isValidInvoiceRegistrationNumber = (regNumber: string): boolean => {
  return INVOICE_REGISTRATION_NUMBER_REGEX.test(regNumber.trim().toUpperCase());
};

export type ConsumptionTaxBreakdown = {
  /** 税込合計金額 (例: 2,980円) */
  grossAmountJpy: number;
  /** 税抜金額 (例: 2,709円) */
  netAmountJpy: number;
  /** 消費税額 (10%対象, 例: 271円) */
  taxAmountJpy: number;
  /** 適用税率 (10%) */
  taxRatePercent: number;
};

/**
 * 税込金額から消費税(10%)と税抜金額を計算する(端数四捨五入)
 */
export const calculateConsumptionTax = (grossAmountJpy: number, taxRate = 0.1): ConsumptionTaxBreakdown => {
  const taxAmountJpy = Math.round(grossAmountJpy * (taxRate / (1 + taxRate)));
  const netAmountJpy = grossAmountJpy - taxAmountJpy;

  return {
    grossAmountJpy,
    netAmountJpy,
    taxAmountJpy,
    taxRatePercent: Math.round(taxRate * 100),
  };
};

export type QualifiedInvoiceProps = {
  invoiceId: string;
  issueDate: string; // YYYY-MM-DD
  billingPeriod?: string; // 例: 2026年10月度
  customerName: string;
  issuerName?: string;
  issuerRegistrationNumber?: string;
  issuerAddress?: string;
  itemName: string;
  amountJpy: number;
};

export const DEFAULT_ISSUER = {
  name: '株式会社デンケイ',
  registrationNumber: 'T1010001999999',
  address: '東京都千代田区霞が関1-1-1',
};

/**
 * 適格請求書(インボイス)のHTMLを生成する
 */
export const generateQualifiedInvoiceHtml = (props: QualifiedInvoiceProps): string => {
  const tax = calculateConsumptionTax(props.amountJpy);
  const issuerName = props.issuerName || DEFAULT_ISSUER.name;
  const registrationNumber = props.issuerRegistrationNumber || DEFAULT_ISSUER.registrationNumber;
  const issuerAddress = props.issuerAddress || DEFAULT_ISSUER.address;

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <title>適格請求書 - ${props.invoiceId}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif;
      color: #1a1a1a;
      line-height: 1.6;
      margin: 0;
      padding: 24px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 12px;
      margin-bottom: 24px;
    }
    .title {
      font-size: 24px;
      font-weight: 700;
      color: #1e3a8a;
      margin: 0;
    }
    .invoice-badge {
      display: inline-block;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 6px;
    }
    .meta-table {
      font-size: 13px;
      text-align: right;
    }
    .meta-table td { padding: 2px 0 2px 12px; }
    .grid {
      display: flex;
      justify-content: space-between;
      margin-bottom: 32px;
    }
    .customer-box {
      font-size: 16px;
      border-bottom: 1px solid #333;
      padding-bottom: 8px;
      min-width: 260px;
    }
    .customer-name {
      font-weight: 700;
      font-size: 18px;
    }
    .issuer-box {
      font-size: 13px;
      text-align: right;
    }
    .reg-number {
      font-weight: 700;
      color: #0f172a;
      font-size: 13px;
    }
    .total-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .total-label { font-size: 14px; font-weight: 600; color: #475569; }
    .total-amount { font-size: 28px; font-weight: 800; color: #0f172a; }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 13px;
    }
    .items-table th {
      background: #f1f5f9;
      padding: 10px 12px;
      text-align: left;
      border-bottom: 2px solid #cbd5e1;
    }
    .items-table td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    .tax-breakdown-table {
      width: 320px;
      margin-left: auto;
      border-collapse: collapse;
      font-size: 13px;
      margin-bottom: 32px;
    }
    .tax-breakdown-table td {
      padding: 6px 12px;
      border-bottom: 1px solid #f1f5f9;
    }
    .footer-note {
      font-size: 11px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">適 格 請 求 書</h1>
      <span class="invoice-badge">インボイス制度対応 (消費税法第57条の4準拠)</span>
    </div>
    <table class="meta-table">
      <tr><td>請求番号:</td><td><strong>${props.invoiceId}</strong></td></tr>
      <tr><td>発行日:</td><td>${props.issueDate}</td></tr>
      ${props.billingPeriod ? `<tr><td>対象期間:</td><td>${props.billingPeriod}</td></tr>` : ''}
    </table>
  </div>

  <div class="grid">
    <div>
      <div class="customer-box">
        <span class="customer-name">${props.customerName}</span> 御中
      </div>
      <p style="font-size: 12px; color: #64748b; margin-top: 8px;">下記の通りご請求申し上げます。</p>
    </div>
    <div class="issuer-box">
      <div style="font-weight: 700; font-size: 15px;">${issuerName}</div>
      <div class="reg-number">登録番号: ${registrationNumber}</div>
      <div style="color: #475569; margin-top: 4px;">${issuerAddress}</div>
    </div>
  </div>

  <div class="total-box">
    <span class="total-label">ご請求金額 (税込)</span>
    <span class="total-amount">¥${props.amountJpy.toLocaleString()}</span>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th>品目 / 摘要</th>
        <th style="width: 80px; text-align: center;">税率</th>
        <th style="width: 80px; text-align: center;">数量</th>
        <th style="width: 120px; text-align: right;">単価 (税抜)</th>
        <th style="width: 120px; text-align: right;">金額 (税抜)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>${props.itemName}</strong></td>
        <td style="text-align: center;">10%</td>
        <td style="text-align: center;">1</td>
        <td style="text-align: right;">¥${tax.netAmountJpy.toLocaleString()}</td>
        <td style="text-align: right;">¥${tax.netAmountJpy.toLocaleString()}</td>
      </tr>
    </tbody>
  </table>

  <table class="tax-breakdown-table">
    <tr>
      <td style="color: #475569;">10%対象金額 (税抜):</td>
      <td style="text-align: right; font-weight: 600;">¥${tax.netAmountJpy.toLocaleString()}</td>
    </tr>
    <tr>
      <td style="color: #475569;">消費税等 (10%):</td>
      <td style="text-align: right; font-weight: 600;">¥${tax.taxAmountJpy.toLocaleString()}</td>
    </tr>
    <tr style="font-size: 15px; font-weight: 700; border-top: 2px solid #cbd5e1;">
      <td>合計金額 (税込):</td>
      <td style="text-align: right; color: #1e3a8a;">¥${tax.grossAmountJpy.toLocaleString()}</td>
    </tr>
  </table>

  <div class="footer-note">
    ※ 本請求書は消費税法に定める適格請求書（インボイス）です。<br />
    ※ 電子計算機を使用して作成した電磁的記録であり、電子帳簿保存法に基づき適正に保管してください。
  </div>
</body>
</html>`;
};
