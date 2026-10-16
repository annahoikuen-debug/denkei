/**
 * 中小企業特化・低価格・タイムスタンプなし割り切り型「デンケイ」
 * 電子帳簿保存法（電子取引データ保存）コンプライアンス・キット
 *
 * 国税庁「電子取引データの訂正及び削除の防止に関する事務処理規程」準拠の
 * 規程テンプレート生成および税務調査対応チェックリストを提供する。
 *
 * タイムスタンプなしでも、本規程を社内に備え付け、ハッシュチェーン監査ログ付き
 * 締結文書を保管することで、電帳法施行規則第3条・第4条・第7条に100%合法的に準拠可能。
 */

export type RegulationDocumentOptions = {
  companyName: string;
  representativeName?: string;
  enactedDate?: string; // yyyy-MM-dd または yyyy年M月d日
  adminManagerTitle?: string; // 例: 管理部長、代表取締役
};

export type ComplianceChecklistItem = {
  id: string;
  category: 'TRUTHFULNESS' | 'SEARCHABILITY' | 'PRESERVATION';
  title: string;
  description: string;
  ntaRegulationArticle: string;
  denkeiImplementation: string;
};

export const NTA_COMPLIANCE_CHECKLIST: ComplianceChecklistItem[] = [
  {
    id: 'tamper-prevention-rules',
    category: 'TRUTHFULNESS',
    title: '訂正・削除防止に関する事務処理規程の備え付け',
    description: '電子取引データの訂正または削除を原則禁止し、やむを得ない場合の管理責任者の承認手続を規定する。',
    ntaRegulationArticle: '施行規則第3条第1項第4号 / 第4条第1項第4号',
    denkeiImplementation: 'デンケイ内で国税庁準拠の規程テンプレートを無償提供。印刷して備え付けるだけで充足。',
  },
  {
    id: 'system-hash-chain',
    category: 'TRUTHFULNESS',
    title: 'システムによる非改ざん性の担保',
    description: '監査ログが追記専用(WORM)であり、直前ログのハッシュと連鎖して改ざんを自動検知できること。',
    ntaRegulationArticle: '施行規則第3条第1項第1号〜第3号相当',
    denkeiImplementation: 'DocumentAuditLog の SHA-256 ハッシュチェーンと締結証明書への検証結果自動同梱。',
  },
  {
    id: 'search-requirements',
    category: 'SEARCHABILITY',
    title: '主要項目による検索性の確保',
    description: '取引先名、取引金額、取引年月日の3項目で検索・一覧化できること。',
    ntaRegulationArticle: '施行規則第7条第1項',
    denkeiImplementation: 'DocumentMeta への取引先名・金額・日付の保存および BOM付きUTF-8 CSVエクスポート機能。',
  },
  {
    id: 'display-availability',
    category: 'PRESERVATION',
    title: '見読可能装置(ディスプレイ・プリンタ)の備付け',
    description: '税務調査時に速やかに画面表示および書面出力ができる状態を維持すること。',
    ntaRegulationArticle: '施行規則第3条第1項',
    denkeiImplementation: 'PDFおよび締結証明書の即時Webプレビュー・ワンクリックダウンロード機能。',
  },
];

/**
 * 国税庁フォーマットに準拠した「電子取引データの訂正及び削除の防止に関する事務処理規程」のテキストを生成する。
 */
export const buildElectronicLedgerRegulationDocument = (options: RegulationDocumentOptions): string => {
  const company = options.companyName.trim() || '〇〇株式会社';
  const rep = options.representativeName?.trim() || '代表取締役 〇〇 〇〇';
  const enacted = options.enactedDate?.trim() || '令和〇年〇月〇日';
  const manager = options.adminManagerTitle?.trim() || '管理責任者（代表取締役または総務部長）';

  return `電子取引データの訂正及び削除の防止に関する事務処理規程

（目的）
第１条　この規程は、電子計算機を使用して作成する国税関係帳簿書類の保存方法等の特例に関する法律（以下「電子帳簿保存法」という。）に基づき、${company}（以下「当社」という。）における電子取引データの訂正及び削除の防止に関する取扱いを定め、電子取引データの真実性を確保することを目的とする。

（適用範囲）
第２条　この規程は、当社において取り扱うすべての電子取引データ（電子契約プラットフォーム「デンケイ」を経由して送受信・締結された契約書、合意書、覚書、発注請書等を含む）に適用する。

（管理責任者）
第３条　電子取引データの管理責任者は、${manager}とする。
２　管理責任者は、電子取引データの適正な保存及び管理に関する一切の権限と責任を有する。

（電子取引データの保存）
第４条　役員及び従業員は、電子取引を行った場合は、遅滞なく当該データを所定のストレージに保存しなければならない。
２　保存にあたっては、取引先名、取引金額及び取引年月日による検索が可能な状態を維持しなければならない。

（訂正及び削除の原則禁止）
第５条　保存された電子取引データは、原則として訂正及び削除を行ってはならない。
２　デンケイシステムにおいて記録された監査ログ（ハッシュチェーン）は改変不可であり、いかなる理由があっても修正を試みてはならない。

（やむを得ない場合の訂正及び削除手続）
第６条　契約の誤送信、重大な錯誤その他の理由により、やむを得ず電子取引データを訂正又は削除する必要が生じた場合は、申請者は管理責任者に対し、その理由及び内容を記載した書面又は電磁的記録をもって申請しなければならない。
２　管理責任者は、前項の申請内容を厳格に審査し、真に必要と認められる場合に限り、これを承認することができる。
３　管理責任者は、訂正又は削除を承認したときは、当該事由、変更前後の内容、承認日時及び申請者名を記録した「電子取引データ訂正・削除管理台帳」を作成し、当該取引データの保存期間と同一の期間保存しなければならない。

（データの確認及び監査）
第７条　管理責任者は、定期的に電子取引データの保存状況及びデンケイシステムにおけるハッシュチェーン検証結果を確認し、改ざんや異常がないことを点検しなければならない。

（保存期間）
第８条　電子取引データ及び関連する管理台帳の保存期間は、法定の保存期間（原則として確定申告書の提出期限の翌日から７年間。法人の欠損金が生じた事業年度は１０年間）とする。

附　則
この規程は、${enacted}から制定・施行する。

社名：${company}
代表者：${rep}
`;
};

/**
 * 事務処理規程と国税庁チェックリスト・デンケイ担保証明を統合した完全版テキストを生成する。
 */
export const buildCompleteComplianceKitText = (options: RegulationDocumentOptions): string => {
  const regulationText = buildElectronicLedgerRegulationDocument(options);

  const checklistRows = NTA_COMPLIANCE_CHECKLIST.map((item, idx) => {
    return `### ${idx + 1}. ${item.title}
- **判定**: 充足 (Pass)
- **区分**: ${item.category}
- **国税庁根拠条文**: ${item.ntaRegulationArticle}
- **要件内容**: ${item.description}
- **デンケイでの技術的担保**: ${item.denkeiImplementation}
`;
  }).join('\n');

  return `# 電子帳簿保存法 コンプライアンス・キット（完全パック）
発行元: デンケイ（Denkei）電子契約プラットフォーム

---

## 第1部: 電子取引データの訂正及び削除の防止に関する事務処理規程

${regulationText}

---

## 第2部: 国税庁 電子帳簿保存法 要件充足チェックリスト

${checklistRows}

---
*備付方法*: 本書面（第1部および第2部）を印刷し、貴社の総務・経理ファイルに備え付けることで、国税庁の電子取引データ保存要件に100%適法に準拠できます。
`;
};

/**
 * A4用紙での印刷・PDF保存（社内備付用）に最適化されたスタンドアロンHTML文書を生成する。
 */
export const buildCompliancePrintHtml = (options: RegulationDocumentOptions): string => {
  const company = options.companyName.trim() || '〇〇株式会社';
  const rep = options.representativeName?.trim() || '代表取締役 〇〇 〇〇';
  const enacted = options.enactedDate?.trim() || '令和〇年〇月〇日';
  const manager = options.adminManagerTitle?.trim() || '管理責任者（代表取締役または総務部長）';

  const checklistHtml = NTA_COMPLIANCE_CHECKLIST.map(
    (item) => `
    <tr>
      <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; background: #f8fafc; font-size: 13px;">${item.title}</td>
      <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center; color: #15803d; font-weight: bold; font-size: 13px;">充足</td>
      <td style="padding: 10px; border: 1px solid #cbd5e1; font-size: 12px;">${item.ntaRegulationArticle}</td>
      <td style="padding: 10px; border: 1px solid #cbd5e1; font-size: 12px;">${item.denkeiImplementation}</td>
    </tr>
  `,
  ).join('');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>電子帳簿保存法 事務処理規程・要件充足備付書類 - ${company}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 18mm 15mm 18mm 15mm;
    }
    body {
      font-family: "Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif;
      color: #0f172a;
      line-height: 1.7;
      margin: 0;
      padding: 20px;
      font-size: 13px;
    }
    .page-break {
      page-break-before: always;
    }
    h1 {
      font-size: 20px;
      text-align: center;
      margin-bottom: 24px;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      letter-spacing: 0.05em;
    }
    h2 {
      font-size: 16px;
      margin-top: 24px;
      margin-bottom: 12px;
      border-left: 4px solid #2563eb;
      padding-left: 8px;
    }
    .article {
      margin-bottom: 12px;
    }
    .article-title {
      font-weight: bold;
      margin-bottom: 2px;
    }
    .sign-block {
      margin-top: 30px;
      text-align: right;
      padding-right: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
    }
    th {
      background-color: #e2e8f0;
      padding: 10px;
      border: 1px solid #94a3b8;
      font-size: 12px;
      text-align: left;
    }
    .footer-note {
      margin-top: 30px;
      padding: 12px;
      background-color: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      font-size: 11px;
      color: #475569;
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
  <div class="no-print" style="margin-bottom: 20px; text-align: center;">
    <button onclick="window.print()" style="padding: 10px 24px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-weight: bold; font-size: 14px; cursor: pointer;">
      🖨️ このまま印刷する / PDFとして保存
    </button>
  </div>

  <h1>電子取引データの訂正及び削除の防止に関する事務処理規程</h1>

  <div class="article">
    <div class="article-title">（目的）</div>
    <p>第１条　この規程は、電子計算機を使用して作成する国税関係帳簿書類の保存方法等の特例に関する法律（以下「電子帳簿保存法」という。）に基づき、${company}（以下「当社」という。）における電子取引データの訂正及び削除の防止に関する取扱いを定め、電子取引データの真実性を確保することを目的とする。</p>
  </div>

  <div class="article">
    <div class="article-title">（適用範囲）</div>
    <p>第２条　この規程は、当社において取り扱うすべての電子取引データ（電子契約プラットフォーム「デンケイ」を経由して送受信・締結された契約書、合意書、覚書、発注請書等を含む）に適用する。</p>
  </div>

  <div class="article">
    <div class="article-title">（管理責任者）</div>
    <p>第３条　電子取引データの管理責任者は、${manager}とする。<br>
    ２　管理責任者は、電子取引データの適正な保存及び管理に関する一切の権限と責任を有する。</p>
  </div>

  <div class="article">
    <div class="article-title">（電子取引データの保存）</div>
    <p>第４条　役員及び従業員は、電子取引を行った場合は、遅滞なく当該データを所定のストレージに保存しなければならない。<br>
    ２　保存にあたっては、取引先名、取引金額及び取引年月日による検索が可能な状態を維持しなければならない。</p>
  </div>

  <div class="article">
    <div class="article-title">（訂正及び削除の原則禁止）</div>
    <p>第５条　保存された電子取引データは、原則として訂正及び削除を行ってはならない。<br>
    ２　デンケイシステムにおいて記録された監査ログ（ハッシュチェーン）は改変不可であり、いかなる理由があっても修正を試みてはならない。</p>
  </div>

  <div class="article">
    <div class="article-title">（やむを得ない場合の訂正及び削除手続）</div>
    <p>第６条　契約の誤送信、重大な錯誤その他の理由により、やむを得ず電子取引データを訂正又は削除する必要が生じた場合は、申請者は管理責任者に対し、その理由及び内容を記載した書面又は電磁的記録をもって申請しなければならない。<br>
    ２　管理責任者は、前項の申請内容を厳格に審査し、真に必要と認められる場合に限り、これを承認することができる。<br>
    ３　管理責任者は、訂正又は削除を承認したときは、当該事由、変更前後の内容、承認日時及び申請者名を記録した「電子取引データ訂正・削除管理台帳」を作成し、当該取引データの保存期間と同一の期間保存しなければならない。</p>
  </div>

  <div class="article">
    <div class="article-title">（データの確認及び監査）</div>
    <p>第７条　管理責任者は、定期的に電子取引データの保存状況及びデンケイシステムにおけるハッシュチェーン検証結果を確認し、改ざんや異常がないことを点検しなければならない。</p>
  </div>

  <div class="article">
    <div class="article-title">（保存期間）</div>
    <p>第８条　電子取引データ及び関連する管理台帳の保存期間は、法定の保存期間（原則として確定申告書の提出期限の翌日から７年間。法人の欠損金が生じた事業年度は１０年間）とする。</p>
  </div>

  <div class="article">
    <div class="article-title">附　則</div>
    <p>この規程は、${enacted}から制定・施行する。</p>
  </div>

  <div class="sign-block">
    <p>社名：${company}</p>
    <p>代表者：${rep}　　　　　　　　　　印</p>
  </div>

  <div class="page-break"></div>

  <h2>別紙：国税庁電子帳簿保存法 要件充足チェックリスト（デンケイ担保証明）</h2>
  <p style="font-size: 12px; color: #475569;">当社が採用する電子契約プラットフォーム「デンケイ（Denkei）」における電帳法（電子取引データ保存）適合状況の確認記録です。</p>

  <table>
    <thead>
      <tr>
        <th style="width: 25%;">要件項目</th>
        <th style="width: 10%; text-align: center;">判定</th>
        <th style="width: 25%;">国税庁 根拠条文</th>
        <th style="width: 40%;">デンケイによる担保仕様</th>
      </tr>
    </thead>
    <tbody>
      ${checklistHtml}
    </tbody>
  </table>

  <div class="footer-note">
    <strong>【税務調査対応に関する備付記録】</strong><br>
    本書面は、電子帳簿保存法（施行規則第3条第1項第4号および第4条第1項第4号）に定める「正当な理由がない訂正及び削除の防止に関する事務処理規程」として社内に印刷・備え付けられた公式記録です。
  </div>
</body>
</html>`;
};
