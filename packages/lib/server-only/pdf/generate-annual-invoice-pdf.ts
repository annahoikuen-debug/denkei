import {
  type AnnualQualifiedInvoiceProps,
  calculateConsumptionTax,
  DEFAULT_ISSUER,
  generateAnnualQualifiedInvoiceHtml,
} from '../../universal/qualified-invoice';

export type GenerateAnnualInvoicePdfOptions = AnnualQualifiedInvoiceProps & {
  // 追加メタデータ
};

/**
 * 年間一括適格請求書/領収書のHTMLおよび印刷用メタデータを取得する。
 * ブラウザレス/Playwright環境が存在する場合はPDFバッファ化も可能。
 */
export const generateAnnualInvoiceData = (options: GenerateAnnualInvoicePdfOptions) => {
  const html = generateAnnualQualifiedInvoiceHtml(options);
  const tax = calculateConsumptionTax(options.amountJpy ?? (options.planId === 'BUSINESS' ? 49800 : 29760));

  return {
    html,
    tax,
    issuer: DEFAULT_ISSUER,
    filename: `denkei-qualified-invoice-${options.invoiceId}.html`,
  };
};

/**
 * サーバーサイドでHTMLからPDFバッファを生成するハンドラー
 */
export const generateAnnualInvoicePdf = async (
  options: GenerateAnnualInvoicePdfOptions,
): Promise<{ buffer: Buffer; filename: string }> => {
  const { html } = generateAnnualInvoiceData(options);

  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm',
      },
    });
    await browser.close();

    return {
      buffer: pdfBuffer,
      filename: `denkei-invoice-${options.invoiceId}.pdf`,
    };
  } catch (_error) {
    // Playwright非稼働環境（ローカルテスト等）ではHTMLをバッファとしてフォールバック提供
    return {
      buffer: Buffer.from(html, 'utf-8'),
      filename: `denkei-invoice-${options.invoiceId}.html`,
    };
  }
};
