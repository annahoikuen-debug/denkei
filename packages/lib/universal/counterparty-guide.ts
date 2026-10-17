/**
 * 取引先（相手方）向け「電子契約移行のお願い」配布キット
 *
 * 中小企業が取引先に電子契約への移行を切り出す際、
 * 「費用負担ゼロ」「アプリ・会員登録不要」「スマホ10秒押印」「電帳法・法的根拠」
 * を明快に説明し、相手方の不安や疑問を事前に解消する。
 */

export type CounterpartyNoticeOptions = {
  companyName: string; // 導入企業名 (例: 株式会社〇〇)
  representativeName?: string; // 代表者名または担当部署
  effectiveDate?: string; // 運用開始時期 (例: 令和8年11月1日)
  contactEmail?: string; // 問い合わせ先メール
  contactPhone?: string; // 問い合わせ先電話
  serviceName?: string; // 電子契約サービス名 (既定: デンケイ)
};

/**
 * 取引先向け案内文（A4 1枚書面／メール連絡用）のプレーンテキストを生成
 */
export const buildCounterpartyNoticeText = (options: CounterpartyNoticeOptions): string => {
  const company = options.companyName.trim() || '当社';
  const effective = options.effectiveDate?.trim() || '近日中';
  const contactEmail = options.contactEmail?.trim() || '担当者メールアドレス';
  const contactPhone = options.contactPhone?.trim();
  const service = options.serviceName?.trim() || 'デンケイ（Denkei）';

  return `取引先各位

${company}
電子契約サービス導入に伴うお願いとお知らせ

拝啓 貴社におかれましては益々ご清栄のこととお慶び申し上げます。
平素は格別のご高配を賜り、厚く御礼申し上げます。

さて、当社では近年の法改正（改正電子帳簿保存法・インボイス制度）への適法対応および、
双方の契約業務における郵送・印紙・製本の手間とコスト削減を目的として、
${effective}より、電子契約プラットフォーム「${service}」を導入することといたしました。

つきましては、今後の契約書・覚書等の締結手続きについて、原則として電子契約にて
執り行わせていただきたく、下記の通りご案内申し上げます。

記

1. 貴社（相手方様）のメリットとご負担について
  (1) 費用負担は一切ございません（完全無料）。
  (2) 専用アプリのインストールやアカウント会員登録は不要です。
  (3) パソコンはもちろん、スマートフォン・タブレットの標準ブラウザから
      10秒程度で見慣れた「朱肉の電子認印（または角印・サイン）」を押印いただけます。
  (4) 収入印紙の貼付が不要（印紙税法上非課税）となり、郵送・返送の手間がなくなります。

2. 締結のお手続き（簡単な3ステップ）
  Step 1: 当社より貴社ご担当者様宛に、署名依頼メール（URLリンク付き）が届きます。
  Step 2: メール内のリンクを開き、契約書面の内容をご確認いただきます。
  Step 3: 「押印」ボタンをタップし、苗字を入力して送信すれば締結完了です。
          ※完了後、改ざん防止ハッシュが施された正規のPDF契約書が双方に即時自動配信されます。

3. 法的有効性およびセキュリティについて
  ・電子署名法第2条・第3条および民法第522条第2項に完全準拠し、法的に有効な契約証跡を担保。
  ・国税庁公認の事務処理規程およびSHA-256ハッシュチェーン監査ログを同梱。
  ・税務調査時にもそのまま電磁的記録として保存・提示が可能です。

4. 本件に関するお問い合わせ先
  ${company}
  担当窓口: ${contactEmail}${contactPhone ? ` / TEL: ${contactPhone}` : ''}

以上、何卒ご理解とご協力を賜りますようお願い申し上げます。
敬具
`;
};

/**
 * メール送信用 コピペ用短文テンプレート
 */
export const buildCounterpartyEmailTemplate = (
  options: CounterpartyNoticeOptions,
): { subject: string; body: string } => {
  const company = options.companyName.trim() || '当社';
  const service = options.serviceName?.trim() || 'デンケイ';

  const subject = `【お知らせ】電子契約サービス（${service}）導入に伴うお願い（${company}）`;

  const body = `お取引先様 各位

いつも大変お世話になっております。${company}でございます。

この度、当社では契約業務の迅速化およびペーパーレス化推進のため、
電子契約サービス「${service}」を導入することとなりました。

今後の契約締結にあたり、メールにて署名用URLをお送りさせていただきます。
【お取引先様へのお願いとメリット】
・費用は一切発生いたしません（完全無料）。
・会員登録やアプリのインストールは不要です。
・メール記載のURLより、スマホ・PCで10秒程度で朱肉認印を押印いただけます。

詳しいご案内資料が必要な場合は、添付またはお気軽にお申し付けください。
何卒ご理解とご協力のほどよろしくお願い申し上げます。
`;

  return { subject, body };
};

/**
 * 取引先向け案内書（A4 1枚・社外配布／印刷用）の美麗HTMLを生成
 */
export const buildCounterpartyPrintHtml = (options: CounterpartyNoticeOptions): string => {
  const company = options.companyName.trim() || '当社';
  const effective = options.effectiveDate?.trim() || '近日中';
  const contactEmail = options.contactEmail?.trim() || '担当窓口メールアドレス';
  const contactPhone = options.contactPhone?.trim();
  const service = options.serviceName?.trim() || 'デンケイ（Denkei）';
  const rep = options.representativeName?.trim() || '';

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>電子契約サービス導入に伴うお願いとお知らせ - ${company}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm 12mm 15mm;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif;
      color: #0f172a;
      line-height: 1.55;
      margin: 0;
      padding: 16px;
      font-size: 12px;
      background: #ffffff;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    .header-table td {
      vertical-align: top;
      padding: 0;
    }
    h1 {
      font-size: 17px;
      text-align: center;
      margin: 10px 0 14px 0;
      padding: 6px 0;
      background: #f8fafc;
      border-top: 2px solid #0f172a;
      border-bottom: 2px solid #0f172a;
      letter-spacing: 0.05em;
    }
    .lead-box {
      background: #f1f5f9;
      border-left: 4px solid #dc2626;
      padding: 8px 12px;
      margin-bottom: 14px;
      font-size: 11.5px;
      color: #334155;
    }
    .section-title {
      font-size: 13px;
      font-weight: bold;
      margin: 12px 0 6px 0;
      color: #0f172a;
      border-left: 3px solid #2563eb;
      padding-left: 6px;
    }
    .merit-grid {
      display: table;
      width: 100%;
      table-layout: fixed;
      border-spacing: 8px;
      margin: 0 -8px 8px -8px;
    }
    .merit-card {
      display: table-cell;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 10px;
      vertical-align: top;
    }
    .merit-card-title {
      font-weight: bold;
      font-size: 12px;
      color: #dc2626;
      margin-bottom: 4px;
    }
    .merit-card-desc {
      font-size: 11px;
      color: #475569;
      line-height: 1.45;
    }
    .steps-container {
      background: #fafafa;
      border: 1px dashed #94a3b8;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 12px;
    }
    .step-item {
      margin-bottom: 4px;
      font-size: 11.5px;
    }
    .step-num {
      font-weight: bold;
      color: #2563eb;
      display: inline-block;
      width: 50px;
    }
    .legal-box {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      background: #f8fafc;
      padding: 8px 12px;
      font-size: 11px;
      color: #475569;
      margin-bottom: 12px;
    }
    .legal-box ul {
      margin: 4px 0 0 16px;
      padding: 0;
    }
    .legal-box li {
      margin-bottom: 2px;
    }
    .footer-contact {
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
      font-size: 11.5px;
      display: flex;
      justify-content: space-between;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 16px; text-align: center;">
    <button onclick="window.print()" style="padding: 10px 24px; background: #dc2626; color: #fff; border: none; border-radius: 6px; font-weight: bold; font-size: 13px; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      🖨️ A4・1枚で印刷 / PDF保存
    </button>
  </div>

  <table class="header-table">
    <tr>
      <td style="font-weight: bold; font-size: 13px;">取引先 各位</td>
      <td style="text-align: right; font-size: 11.5px; color: #334155;">
        ${effective} 運用開始<br>
        <strong>${company}</strong><br>
        ${rep ? `${rep}<br>` : ''}
      </td>
    </tr>
  </table>

  <h1>電子契約サービス導入に伴うお願いとお知らせ</h1>

  <div class="lead-box">
    拝啓 貴社におかれましては益々ご清栄のこととお慶び申し上げます。平素は格別のご高配を賜り厚く御礼申し上げます。<br>
    当社では、契約業務の迅速化・印紙代等のコスト削減および改正電子帳簿保存法への適合を目的として、電子契約プラットフォーム「${service}」を導入することといたしました。今後のご契約につきましては、原則として本方式にてお願いしたく、概要をご案内申し上げます。
  </div>

  <div class="section-title">1. 貴社（相手方様）の3大メリットとご負担ゼロ</div>
  <div class="merit-grid">
    <div class="merit-card">
      <div class="merit-card-title">① 費用は完全無料（0円）</div>
      <div class="merit-card-desc">相手方様に利用料金や初期費用等は一切発生いたしません。何通締結してもずっと無料です。</div>
    </div>
    <div class="merit-card">
      <div class="merit-card-title">② アプリ・会員登録不要</div>
      <div class="merit-card-desc">専用ソフトのインストールや新規ID登録は不要です。届いたメールのリンクから即座に開けます。</div>
    </div>
    <div class="merit-card">
      <div class="merit-card-title">③ スマホで10秒・認印押印</div>
      <div class="merit-card-desc">PCはもちろん、スマホから名字を入力するだけで朱肉認印を押印可能。郵送・返送は不要です。</div>
    </div>
  </div>

  <div class="section-title">2. お手続きの流れ（かんたん3ステップ）</div>
  <div class="steps-container">
    <div class="step-item"><span class="step-num">Step 1</span>当社より、貴社ご担当者様のメールアドレス宛に「署名依頼メール」が届きます。</div>
    <div class="step-item"><span class="step-num">Step 2</span>メール内のURLを開き、ブラウザ上で契約書面の内容をご確認いただきます。</div>
    <div class="step-item"><span class="step-num">Step 3</span>押印枠をタップし、苗字を入力して送信すれば完了です（双方に締結済PDFが即時配信）。</div>
  </div>

  <div class="section-title">3. 法的有効性および税務署対応について</div>
  <div class="legal-box">
    <ul>
      <li><strong>電子署名法・民法準拠:</strong> 電子署名法第2条・第3条および民法第522条第2項に適合し、法的に有効な契約証跡を保全。</li>
      <li><strong>印紙税の非課税:</strong> 電子契約は印紙税法上の「課税文書の作成」に該当しないため、収入印紙の貼付が不要（印紙代0円）です。</li>
      <li><strong>電子帳簿保存法対応:</strong> 国税庁が認める「訂正削除防止に関する事務処理規程」およびSHA-256監査ログにより、税務署の調査要件を充足。</li>
    </ul>
  </div>

  <div class="footer-contact">
    <div><strong>【本件に関するお問い合わせ窓口】</strong></div>
    <div style="text-align: right;">
      ${company} 担当窓口<br>
      E-mail: ${contactEmail}${contactPhone ? ` / TEL: ${contactPhone}` : ''}
    </div>
  </div>
</body>
</html>`;
};
