import { formatJpy } from '@documenso/lib/universal/format-currency';

/**
 * フェーズ3 ステップ29: 領収書(インボイス対応)PDF テンプレート
 *
 * htmltopdf 機構で PDF 化する。記載項目:
 * - 発行者情報(氏名・所在地・インボイス登録番号 T番号)
 * - 請求先情報
 * - 明細(税率内訳: 10%/軽減8%)
 * - 合計金額(円)
 */
export type ReceiptPdfProps = {
  /** 発行者(自社)情報 */
  issuer: {
    name: string;
    address: string;
    /** インボイス登録番号(T+13桁) */
    registrationNumber?: string | null;
  };
  /** 請求先(顧客)情報 */
  customer: {
    name: string;
    address?: string | null;
  };
  /** 領収番号 */
  receiptNumber: string;
  /** 発行日(ISO 文字列) */
  issuedAt: string;
  /** 明細行 */
  lineItems: {
    description: string;
    /** 税抜金額(円) */
    amountJpy: number;
    taxRate: 8 | 10;
  }[];
  /** 決済方法 */
  paymentMethod: string;
};

export const ReceiptPdf = ({
  issuer,
  customer,
  receiptNumber,
  issuedAt,
  lineItems,
  paymentMethod,
}: ReceiptPdfProps) => {
  const taxExcluded = lineItems.reduce((sum, item) => sum + item.amountJpy, 0);

  const tax10 = lineItems.filter((i) => i.taxRate === 10).reduce((sum, i) => sum + Math.floor(i.amountJpy * 0.1), 0);

  const tax8 = lineItems.filter((i) => i.taxRate === 8).reduce((sum, i) => sum + Math.floor(i.amountJpy * 0.08), 0);

  const taxIncluded = taxExcluded + tax10 + tax8;

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '40px', color: '#111' }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>領収書</h1>
      <p style={{ fontSize: 12, color: '#555' }}>
        領収番号: {receiptNumber} / 発行日: {issuedAt}
      </p>

      <table style={{ width: '100%', fontSize: 13, marginTop: 24, borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ padding: 8, width: 140, background: '#f3f4f6' }}>発行者</td>
            <td style={{ padding: 8 }}>{issuer.name}</td>
          </tr>
          <tr>
            <td style={{ padding: 8, background: '#f3f4f6' }}>所在地</td>
            <td style={{ padding: 8 }}>{issuer.address}</td>
          </tr>
          {issuer.registrationNumber && (
            <tr>
              <td style={{ padding: 8, background: '#f3f4f6' }}>登録番号</td>
              <td style={{ padding: 8 }} data-testid="receipt-registration-number">
                {issuer.registrationNumber}
              </td>
            </tr>
          )}
          <tr>
            <td style={{ padding: 8, background: '#f3f4f6' }}>請求先</td>
            <td style={{ padding: 8 }}>{customer.name}</td>
          </tr>
          {customer.address && (
            <tr>
              <td style={{ padding: 8, background: '#f3f4f6' }}>請求先所在地</td>
              <td style={{ padding: 8 }}>{customer.address}</td>
            </tr>
          )}
        </tbody>
      </table>

      <table
        style={{ width: '100%', fontSize: 13, marginTop: 24, borderCollapse: 'collapse' }}
        data-testid="receipt-line-items"
      >
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={{ padding: 8, textAlign: 'left' }}>摘要</th>
            <th style={{ padding: 8, textAlign: 'right' }}>税率</th>
            <th style={{ padding: 8, textAlign: 'right' }}>金額(税抜)</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item, i) => (
            <tr key={i}>
              <td style={{ padding: 8 }}>{item.description}</td>
              <td style={{ padding: 8, textAlign: 'right' }}>{item.taxRate}%</td>
              <td style={{ padding: 8, textAlign: 'right' }}>{formatJpy(item.amountJpy)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table style={{ width: '100%', fontSize: 13, marginTop: 16, borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ padding: 8 }}>小計(税抜)</td>
            <td style={{ padding: 8, textAlign: 'right' }} data-testid="receipt-subtotal">
              {formatJpy(taxExcluded)}
            </td>
          </tr>
          <tr>
            <td style={{ padding: 8 }}>消費税 10%</td>
            <td style={{ padding: 8, textAlign: 'right' }}>{formatJpy(tax10)}</td>
          </tr>
          <tr>
            <td style={{ padding: 8 }}>消費税(軽減)8%</td>
            <td style={{ padding: 8, textAlign: 'right' }}>{formatJpy(tax8)}</td>
          </tr>
          <tr style={{ fontWeight: 'bold', borderTop: '2px solid #111' }}>
            <td style={{ padding: 8 }}>合計(税込)</td>
            <td style={{ padding: 8, textAlign: 'right' }} data-testid="receipt-total">
              {formatJpy(taxIncluded)}
            </td>
          </tr>
        </tbody>
      </table>

      <p style={{ fontSize: 12, marginTop: 24 }}>お支払い方法: {paymentMethod}</p>
      <p style={{ fontSize: 11, color: '#666', marginTop: 8 }}>上記金額を正に領収いたしました。</p>
    </div>
  );
};

export default ReceiptPdf;
