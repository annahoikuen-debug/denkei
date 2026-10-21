const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const mascotPath = path.resolve(__dirname, '../../apps/remix/public/images/denkei-mascot.webp');
const mascotBase64 = fs.readFileSync(mascotPath).toString('base64');
const _mascotDataUri = `data:image/webp;base64,${mascotBase64}`;

const mascotCirclePath = path.resolve(__dirname, '../../apps/remix/public/images/denkei-mascot-circle.webp');
const mascotCircleBase64 = fs.existsSync(mascotCirclePath)
  ? fs.readFileSync(mascotCirclePath).toString('base64')
  : mascotBase64;
const mascotCircleDataUri = `data:image/webp;base64,${mascotCircleBase64}`;

const htmlContent = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>デンケイ サービス導入・提案資料</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700;800&family=Outfit:wght@600;700;800&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Noto Sans JP', sans-serif;
      color: #1e293b;
      background: #f8fafc;
      font-size: 13px;
      line-height: 1.6;
    }
    .page {
      width: 210mm;
      height: 297mm;
      position: relative;
      page-break-after: always;
      page-break-inside: avoid;
      background: #ffffff;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      padding: 16mm 20mm 18mm 20mm;
    }
    
    /* ヘッダー・フッター共通 */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 3.5mm;
      border-bottom: 1.5px solid #e2e8f0;
      margin-bottom: 7mm;
    }
    .header-logo {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header-logo img {
      width: 24px;
      height: 24px;
      border-radius: 50%;
    }
    .header-logo-text {
      font-family: 'Outfit', sans-serif;
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .header-subtitle {
      font-size: 10px;
      color: #64748b;
      margin-left: 6px;
    }
    .header-badge {
      font-size: 10px;
      font-weight: 600;
      background: #f1f5f9;
      color: #475569;
      padding: 3px 10px;
      border-radius: 12px;
      border: 1px solid #cbd5e1;
    }

    .page-footer {
      position: absolute;
      bottom: 10mm;
      left: 20mm;
      right: 20mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 3mm;
      border-top: 1px solid #e2e8f0;
      font-size: 10px;
      color: #94a3b8;
    }
    .page-number {
      font-weight: 700;
      color: #64748b;
      font-family: 'Outfit', sans-serif;
    }

    /* タイトル・見出しスタイル */
    .section-tag {
      display: inline-block;
      font-size: 10.5px;
      font-weight: 700;
      color: #0284c7;
      background: #e0f2fe;
      padding: 3px 10px;
      border-radius: 4px;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .page-title {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px 0;
      line-height: 1.3;
      letter-spacing: -0.3px;
    }
    .page-desc {
      font-size: 12px;
      color: #475569;
      margin: 0 0 6mm 0;
    }

    /* 表・カード共通 */
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 18px;
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
    }
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }

    /* テーブルデザイン */
    .styled-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11.5px;
    }
    .styled-table th, .styled-table td {
      padding: 9px 12px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    .styled-table th {
      background: #f8fafc;
      font-weight: 700;
      color: #334155;
      border-top: 1px solid #e2e8f0;
    }
    .styled-table tr:hover td {
      background: #f1f5f9;
    }

    /* PAGE 1: 表紙 (Cover) */
    .page-cover {
      background: linear-gradient(135deg, #090d16 0%, #0f172a 60%, #1e293b 100%);
      color: #ffffff;
      padding: 24mm 24mm 20mm 24mm;
      justify-content: space-between;
    }
    .cover-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .cover-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .cover-brand img {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 2px solid #38bdf8;
    }
    .cover-brand-title {
      font-family: 'Outfit', sans-serif;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #ffffff;
    }
    .cover-tag {
      font-size: 11px;
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.4);
      color: #38bdf8;
      padding: 4px 14px;
      border-radius: 20px;
      font-weight: 600;
    }
    .cover-center {
      margin-top: 25mm;
    }
    .cover-badge {
      display: inline-block;
      font-size: 12px;
      font-weight: 700;
      color: #38bdf8;
      letter-spacing: 1px;
      margin-bottom: 12px;
      text-transform: uppercase;
    }
    .cover-title {
      font-size: 34px;
      font-weight: 800;
      line-height: 1.3;
      margin: 0 0 16px 0;
      color: #ffffff;
      letter-spacing: -0.5px;
    }
    .cover-title span {
      background: linear-gradient(90deg, #38bdf8, #818cf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .cover-subtitle {
      font-size: 16px;
      color: #94a3b8;
      line-height: 1.6;
      margin: 0 0 24px 0;
      max-width: 580px;
    }
    .cover-highlights {
      display: flex;
      gap: 16px;
      margin-top: 10mm;
    }
    .cover-highlight-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      padding: 14px 20px;
      flex: 1;
      backdrop-filter: blur(10px);
    }
    .cover-highlight-val {
      font-family: 'Outfit', sans-serif;
      font-size: 26px;
      font-weight: 800;
      color: #38bdf8;
      margin-bottom: 2px;
    }
    .cover-highlight-lbl {
      font-size: 11px;
      color: #cbd5e1;
    }
    .cover-bottom {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      padding-top: 6mm;
    }
    .cover-author {
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.7;
    }
    .cover-date {
      font-size: 11px;
      color: #64748b;
      font-family: 'Outfit', sans-serif;
    }

    /* アイコンバッジ */
    .icon-box {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: #eff6ff;
      color: #0284c7;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 18px;
      margin-bottom: 10px;
    }

    /* 各種装飾 */
    .pill {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .pill-blue { background: #e0f2fe; color: #0369a1; }
    .pill-green { background: #dcfce7; color: #15803d; }
    .pill-amber { background: #fef3c7; color: #b45309; }
    .pill-red { background: #fee2e2; color: #b91c1c; }

    .check-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .check-list li {
      position: relative;
      padding-left: 20px;
      margin-bottom: 8px;
      font-size: 12px;
    }
    .check-list li::before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #0284c7;
      font-weight: 800;
    }

    .step-num {
      width: 24px;
      height: 24px;
      background: #0284c7;
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-right: 8px;
    }
  </style>
</head>
<body>

  <!-- ==================== PAGE 1: 表紙 ==================== -->
  <div class="page page-cover">
    <div class="cover-top">
      <div class="cover-brand">
        <img src="${mascotCircleDataUri}" alt="Denkei Mascot">
        <div class="cover-brand-title">デンケイ (Denkei)</div>
      </div>
      <div class="cover-tag">2026年最新 企業導入提案資料</div>
    </div>

    <div class="cover-center">
      <div class="cover-badge">SaaS & Enterprise Electronic Contract Solution</div>
      <h1 class="cover-title">
        契約業務の負担を<span>90%削減</span>する、<br>
        中小企業特化型 電子契約サービス
      </h1>
      <p class="cover-subtitle">
        月額2,980円から導入可能。タイムスタンプ費用0円・契約原価0.5円以下の圧倒的コストパフォーマンスと、電子帳簿保存法・インボイス制度完全準拠の強固な法的証拠力を両立。
      </p>

      <div class="cover-highlights">
        <div class="cover-highlight-card">
          <div class="cover-highlight-val">90% OFF</div>
          <div class="cover-highlight-lbl">従来大手比のトータル運用コスト削減</div>
        </div>
        <div class="cover-highlight-card">
          <div class="cover-highlight-val">1分</div>
          <div class="cover-highlight-lbl">相手先のアカウント登録・アプリ不要</div>
        </div>
        <div class="cover-highlight-card">
          <div class="cover-highlight-val">100%</div>
          <div class="cover-highlight-lbl">電帳法・インボイス・改ざん防止技術対応</div>
        </div>
      </div>
    </div>

    <div class="cover-bottom">
      <div class="cover-author">
        <strong>株式会社デンケイ / プロダクト事業部</strong><br>
        サービスサイト: https://contracts.denkei.jp &nbsp;|&nbsp; お問い合わせ: support@denkei.jp
      </div>
      <div class="cover-date">2026年10月版 / Ver 2.0</div>
    </div>
  </div>

  <!-- ==================== PAGE 2: 解決する課題 ==================== -->
  <div class="page">
    <div class="page-header">
      <div class="header-logo">
        <img src="${mascotCircleDataUri}" alt="Logo">
        <span class="header-logo-text">Denkei</span>
        <span class="header-subtitle">| サービス資料</span>
      </div>
      <div class="header-badge">01. 導入背景と課題</div>
    </div>

    <span class="section-tag">Challenges</span>
    <h2 class="page-title">紙と大手電子契約が抱える「三重苦」</h2>
    <p class="page-desc">契約書の印刷・製本・郵送にかかる業務負担だけでなく、既存の電子契約ツールにおける高額な従量課金や相手先への負担が導入の壁となっています。</p>

    <div class="grid-3" style="margin-bottom: 14px;">
      <div class="card" style="border-top: 4px solid #ef4444;">
        <div class="icon-box" style="background:#fee2e2; color:#ef4444;">1</div>
        <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color:#0f172a;">紙契約のコスト・遅延</h3>
        <p style="font-size: 11.5px; color:#64748b; margin: 0 0 10px 0;">
          印紙代（200円〜数万円）、印刷代、郵送往復（往復3〜7日）、製本・押印の手間が発生し、商談スピードを著しく阻害。
        </p>
        <div style="background: #fef2f2; padding: 8px 10px; border-radius: 6px; font-size: 11px; color:#b91c1c;">
          1通あたり平均 <strong>約1,500円〜2,000円</strong> の見えない間接コスト
        </div>
      </div>

      <div class="card" style="border-top: 4px solid #f59e0b;">
        <div class="icon-box" style="background:#fef3c7; color:#d97706;">2</div>
        <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color:#0f172a;">大手ツールの高額従量課金</h3>
        <p style="font-size: 11.5px; color:#64748b; margin: 0 0 10px 0;">
          月額基本料（1〜3万円）に加え、1送信ごとに110円〜220円の送信料や、タイムスタンプ課金が発生し、契約数が増えるほど負担増。
        </p>
        <div style="background: #fffbeb; padding: 8px 10px; border-radius: 6px; font-size: 11px; color:#b45309;">
          年間数十万〜数百万円規模の固定費負担
        </div>
      </div>

      <div class="card" style="border-top: 4px solid #8b5cf6;">
        <div class="icon-box" style="background:#ede9fe; color:#7c3aed;">3</div>
        <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color:#0f172a;">相手先の操作負担・離脱</h3>
        <p style="font-size: 11.5px; color:#64748b; margin: 0 0 10px 0;">
          「相手先にも有料登録を要求」「操作画面が英語・複雑」「SMS認証などの設定が煩雑」などの理由で、契約相手から敬遠されるケースが頻発。
        </p>
        <div style="background: #f5f3ff; padding: 8px 10px; border-radius: 6px; font-size: 11px; color:#6d28d9;">
          「紙で送ってください」と拒否されるトラブル
        </div>
      </div>
    </div>

    <div class="card" style="background: linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%); border-color: #bae6fd;">
      <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color:#0369a1;">
        💡 デンケイ（Denkei）がすべて解決します
      </h3>
      <p style="font-size: 12px; color:#334155; margin: 0;">
        高額な仲介システムや外部依存TSA（タイムスタンプ局）を廃止し、<strong>独自SHA-256ハッシュチェーン＋暗号化技術</strong>を採用。月額2,980円・100件まで無料、相手先はメール受領から1クリック＆スマホで完結するストレスフリーな体験を提供します。
      </p>
    </div>

    <div class="page-footer">
      <span>デンケイ (Denkei) サービス紹介資料</span>
      <span class="page-number">2 / 10</span>
    </div>
  </div>

  <!-- ==================== PAGE 3: デンケイの概要と強み ==================== -->
  <div class="page">
    <div class="page-header">
      <div class="header-logo">
        <img src="${mascotCircleDataUri}" alt="Logo">
        <span class="header-logo-text">Denkei</span>
        <span class="header-subtitle">| サービス資料</span>
      </div>
      <div class="header-badge">02. デンケイの特長</div>
    </div>

    <span class="section-tag">Value Proposition</span>
    <h2 class="page-title">中小企業に選ばれる4つのコアバリュー</h2>
    <p class="page-desc">無駄な機能を削ぎ落とし、「使いやすさ」「圧倒的安さ」「法的信頼性」を極限まで追求しました。</p>

    <div class="grid-2" style="margin-bottom: 12px;">
      <div class="card">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
          <div class="icon-box" style="margin:0;">¥</div>
          <h3 style="margin:0; font-size:14px; font-weight:700;">圧倒的低コスト（原価0.5円以下）</h3>
        </div>
        <p style="font-size:11.5px; color:#64748b; margin:0 0 10px 0;">
          月額2,980円（税込）で毎月100件の締結枠を付与。追加チケットや上位プランで柔軟に拡張可能。外部TSA費用も0円。
        </p>
        <ul class="check-list">
          <li>月額固定費を最大85%削減</li>
          <li>タイムスタンプ費用・更新料なし</li>
        </ul>
      </div>

      <div class="card">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
          <div class="icon-box" style="margin:0;">⚡</div>
          <h3 style="margin:0; font-size:14px; font-weight:700;">相手先アカウント登録不要・1分完了</h3>
        </div>
        <p style="font-size:11.5px; color:#64748b; margin:0 0 10px 0;">
          相手先は送られてきたメールのリンクを開くだけ。スマホ・タブレット・PCどこからでもタップや手書き署名で即時締結。
        </p>
        <ul class="check-list">
          <li>取引先への事前説明・アカウント作成負担ゼロ</li>
          <li>スマホ画面に最適化された署名UI</li>
        </ul>
      </div>

      <div class="card">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
          <div class="icon-box" style="margin:0;">⚖️</div>
          <h3 style="margin:0; font-size:14px; font-weight:700;">電帳法・インボイス制度に完全準拠</h3>
        </div>
        <p style="font-size:11.5px; color:#64748b; margin:0 0 10px 0;">
          電子帳簿保存法第3条・第4条が定める真実性の確保（改ざん防止）、可視性の確保（取引先・日付・金額検索）を標準搭載。
        </p>
        <ul class="check-list">
          <li>SHA-256ハッシュチェーンによる監査ログ</li>
          <li>合意締結証明書（Certificate of Completion）自動発行</li>
        </ul>
      </div>

      <div class="card">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
          <div class="icon-box" style="margin:0;">🛡️</div>
          <h3 style="margin:0; font-size:14px; font-weight:700;">日本国内クラウド環境で堅牢保管</h3>
        </div>
        <p style="font-size:11.5px; color:#64748b; margin:0 0 10px 0;">
          すべてのデータは国内データセンター（東京リージョン）にてAES-256で強固に暗号化。自社専用環境（スタンドアロン）構築も可能。
        </p>
        <ul class="check-list">
          <li>通信・保管時全暗号化（SSL/TLS + AES-256）</li>
          <li>IP制限やチーム権限分離による情報漏洩防止</li>
        </ul>
      </div>
    </div>

    <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 10px 16px; display:flex; align-items:center; gap:14px;">
      <img src="${mascotCircleDataUri}" style="width:36px; height:36px; border-radius:50%;" alt="Mascot">
      <div style="font-size:11.5px; color:#475569;">
        <strong>「これだけでいい」を形にしました。</strong> 大手サービスのように使いこなせない多すぎる機能に高い月額料金を払う必要はありません。中小企業が本当に必要な機能だけをストレスなくお使いいただけます。
      </div>
    </div>

    <div class="page-footer">
      <span>デンケイ (Denkei) サービス紹介資料</span>
      <span class="page-number">3 / 10</span>
    </div>
  </div>

  <!-- ==================== PAGE 4: 主要機能一覧 ==================== -->
  <div class="page">
    <div class="page-header">
      <div class="header-logo">
        <img src="${mascotCircleDataUri}" alt="Logo">
        <span class="header-logo-text">Denkei</span>
        <span class="header-subtitle">| サービス資料</span>
      </div>
      <div class="header-badge">03. 機能一覧</div>
    </div>

    <span class="section-tag">Feature Matrix</span>
    <h2 class="page-title">契約実務を網羅する充実の標準機能</h2>
    <p class="page-desc">基本プラン内で追加料金なくご利用いただける主要機能一覧です。</p>

    <table class="styled-table" style="margin-bottom: 12px;">
      <thead>
        <tr>
          <th style="width: 25%;">機能分類</th>
          <th style="width: 35%;">機能名称</th>
          <th style="width: 40%;">概要・メリット</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td rowspan="3" style="font-weight:700; color:#0369a1; background:#f0f9ff;">書類作成・送信</td>
          <td><strong>ドラッグ＆ドロップ配置</strong></td>
          <td>署名欄、会社名、氏名、押印、日付欄を直感的に配置</td>
        </tr>
        <tr>
          <td><strong>テンプレート管理</strong></td>
          <td>NDAや発注書など頻繁に使う書式を登録し1クリック送信</td>
        </tr>
        <tr>
          <td><strong>一括送信（バルク送信）</strong></td>
          <td>CSVアップロードで多数の取引先・従業員へ同形式契約書を一斉送信</td>
        </tr>
        <tr>
          <td rowspan="3" style="font-weight:700; color:#15803d; background:#f0fdf4;">署名・受領</td>
          <td><strong>手書き署名 / 印影作成</strong></td>
          <td>マウスやスマホ画面での自筆サイン、電子印影（丸印・角印）生成</td>
        </tr>
        <tr>
          <td><strong>メールOTP 2要素認証</strong></td>
          <td>高額なSMS認証に代わり、メール宛ワンタイムパスワードで厳格確認</td>
        </tr>
        <tr>
          <td><strong>リマインド自動送信</strong></td>
          <td>未署名の取引先へ指定間隔で自動リマインドメールを送信</td>
        </tr>
        <tr>
          <td rowspan="2" style="font-weight:700; color:#b45309; background:#fffbeb;">法務・証拠力</td>
          <td><strong>合意締結証明書 (Certificate)</strong></td>
          <td>当事者IP・署名時刻・ハッシュ値を記録した証明書をPDF末尾に自動付与</td>
        </tr>
        <tr>
          <td><strong>改ざん検知ハッシュチェーン</strong></td>
          <td>ドキュメント変更履歴を暗号学的にチェーン化し完全性を保証</td>
        </tr>
        <tr>
          <td rowspan="2" style="font-weight:700; color:#475569; background:#f8fafc;">管理・統制</td>
          <td><strong>電帳法 3要件検索</strong></td>
          <td>「取引先」「契約日」「契約金額」の複数条件による高速横断検索</td>
        </tr>
        <tr>
          <td><strong>メンバー権限管理</strong></td>
          <td>管理者・メンバーなど役職に応じた書類アクセス権限の分離</td>
        </tr>
      </tbody>
    </table>

    <div class="card" style="border-left: 4px solid #0284c7; background:#f8fafc;">
      <div style="font-weight:700; font-size:12px; color:#0f172a; margin-bottom:4px;">
        📌 今後も追加費用なしで機能アップデート
      </div>
      <div style="font-size:11px; color:#64748b;">
        デンケイは常にお客様の声を取り入れ、UI改善や法改正対応をクラウド経由で自動アップデートします。保守費用やバージョンアップ費用は一切いただきません。
      </div>
    </div>

    <div class="page-footer">
      <span>デンケイ (Denkei) サービス紹介資料</span>
      <span class="page-number">4 / 10</span>
    </div>
  </div>

  <!-- ==================== PAGE 5: 契約締結の流れ（簡単ステップ） ==================== -->
  <div class="page">
    <div class="page-header">
      <div class="header-logo">
        <img src="${mascotCircleDataUri}" alt="Logo">
        <span class="header-logo-text">Denkei</span>
        <span class="header-subtitle">| サービス資料</span>
      </div>
      <div class="header-badge">04. 操作・利用フロー</div>
    </div>

    <span class="section-tag">How It Works</span>
    <h2 class="page-title">契約締結までのわずか3ステップ</h2>
    <p class="page-desc">マニュアル不要のシンプル設計。送る側も受け取る側も迷わず操作できます。</p>

    <div style="display:flex; flex-direction:column; gap:14px; margin-bottom:14px;">
      <div class="card" style="display:flex; gap:16px; align-items:flex-start;">
        <div class="step-num">1</div>
        <div style="flex:1;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <h3 style="margin:0; font-size:14px; font-weight:700; color:#0f172a;">PDFをアップロードして署名欄を配置</h3>
            <span class="pill pill-blue">送信側の作業 (約1分)</span>
          </div>
          <p style="font-size:11.5px; color:#64748b; margin:0 0 6px 0;">
            普段作成しているWordやPDFファイルをそのままドラッグ＆ドロップ。相手先のメールアドレスを入力し、署名してほしい位置に「署名ボックス」を置くだけで送信準備が完了します。
          </p>
          <div style="font-size:11px; color:#0284c7; font-weight:600;">
            ポイント: 署名順（順番指定）や複数人への一括署名依頼も簡単に設定可能
          </div>
        </div>
      </div>

      <div class="card" style="display:flex; gap:16px; align-items:flex-start;">
        <div class="step-num">2</div>
        <div style="flex:1;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <h3 style="margin:0; font-size:14px; font-weight:700; color:#0f172a;">相手先がメールを開き、画面上で署名</h3>
            <span class="pill pill-green">相手先の作業 (約1分・登録不要)</span>
          </div>
          <p style="font-size:11.5px; color:#64748b; margin:0 0 6px 0;">
            取引先には署名依頼メールが届きます。本文内のボタンをクリックするとブラウザで契約書が表示され、画面上でサインまたは電子印影を押すだけで完了。アカウント作成やログインは一切不要です。
          </p>
          <div style="font-size:11px; color:#15803d; font-weight:600;">
            ポイント: スマートフォンの指先サインにも完全対応。出先からでも即時署名可能
          </div>
        </div>
      </div>

      <div class="card" style="display:flex; gap:16px; align-items:flex-start;">
        <div class="step-num">3</div>
        <div style="flex:1;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <h3 style="margin:0; font-size:14px; font-weight:700; color:#0f172a;">締結完了！双方に証明書付きPDFを即時納品</h3>
            <span class="pill pill-blue">システムによる自動処理</span>
          </div>
          <p style="font-size:11.5px; color:#64748b; margin:0 0 6px 0;">
            双方が署名すると自動的に暗号化封印処理が行われ、全員に締結完了メールが届きます。原本PDFには「合意締結証明書」が一体付加され、改ざん不能な形式で永久保存されます。
          </p>
          <div style="font-size:11px; color:#0284c7; font-weight:600;">
            ポイント: データベースへの自動保管により、電帳法検索要件にも自動で対応
          </div>
        </div>
      </div>
    </div>

    <div class="card" style="background:#f0fdf4; border-color:#86efac; padding:12px 18px;">
      <div style="font-weight:700; font-size:12.5px; color:#166534; margin-bottom:4px;">
        ⏱️ 契約リードタイムを「平均5日間」から「最短5分」へ短縮
      </div>
      <div style="font-size:11.5px; color:#14532d;">
        これまで郵送や押印待ちで数日〜1週間かかっていた契約業務が、商談直後や電話中の数分で成立。案件の失注リスクや着工遅延を根本から撲滅します。
      </div>
    </div>

    <div class="page-footer">
      <span>デンケイ (Denkei) サービス紹介資料</span>
      <span class="page-number">5 / 10</span>
    </div>
  </div>

  <!-- ==================== PAGE 6: 法的効力とセキュリティ ==================== -->
  <div class="page">
    <div class="page-header">
      <div class="header-logo">
        <img src="${mascotCircleDataUri}" alt="Logo">
        <span class="header-logo-text">Denkei</span>
        <span class="header-subtitle">| サービス資料</span>
      </div>
      <div class="header-badge">05. 法的効力・セキュリティ</div>
    </div>

    <span class="section-tag">Legal & Security</span>
    <h2 class="page-title">電帳法・電子署名法・裁判証拠力に完全対応</h2>
    <p class="page-desc">「低価格でも法的に大丈夫か？」というご懸念にお応えする強固な技術基盤と法的根拠。</p>

    <div class="grid-2" style="margin-bottom:14px;">
      <div class="card">
        <h3 style="margin:0 0 8px 0; font-size:13.5px; font-weight:700; color:#0284c7;">
          🏛️ 電子署名法第3条（事業者署名型）
        </h3>
        <p style="font-size:11px; color:#475569; margin:0 0 10px 0;">
          当事者のメール認証（OTP）およびアクセスログ、IPアドレス、ブラウザ情報を組み合わせ、サービス提供者が改ざん不能な電子署名を付与する「事業者署名型（立会人型）」を採用。
        </p>
        <div style="background:#f1f5f9; padding:8px 10px; border-radius:6px; font-size:10.5px; color:#334155;">
          裁判時の立証責任に耐えうる詳細監査証跡（Audit Trail）を全ドキュメントに自動記録。
        </div>
      </div>

      <div class="card">
        <h3 style="margin:0 0 8px 0; font-size:13.5px; font-weight:700; color:#0284c7;">
          📂 電子帳簿保存法（スキャナ・電磁的記録）
        </h3>
        <p style="font-size:11px; color:#475569; margin:0 0 10px 0;">
          法第3条・第4条の「真実性の確保」および「可視性の確保」の要件を標準仕様でクリア。税務調査時にもスムーズに提示できます。
        </p>
        <div style="background:#f1f5f9; padding:8px 10px; border-radius:6px; font-size:10.5px; color:#334155;">
          「訂正・削除履歴の保持」「日付・金額・取引先の複合検索」に完全対応。
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:14px;">
      <h3 style="margin:0 0 10px 0; font-size:13.5px; font-weight:700; color:#0f172a;">
        🔒 エンタープライズ水準のセキュリティ設計
      </h3>
      <div class="grid-3">
        <div>
          <strong style="font-size:11.5px; color:#0f172a;">SHA-256 ハッシュチェーン</strong>
          <p style="font-size:10.5px; color:#64748b; margin:4px 0 0 0;">
            1操作ごとに暗号ハッシュを連鎖記録。万が一の改ざん時も即座に検知。
          </p>
        </div>
        <div>
          <strong style="font-size:11.5px; color:#0f172a;">AES-256 保存時暗号化</strong>
          <p style="font-size:10.5px; color:#64748b; margin:4px 0 0 0;">
            ドキュメント実体およびメタデータは強固な暗号化キーで完全防護。
          </p>
        </div>
        <div>
          <strong style="font-size:11.5px; color:#0f172a;">Google Cloud 国内保管</strong>
          <p style="font-size:10.5px; color:#64748b; margin:4px 0 0 0;">
            高耐久ストレージ（99.999999999%）で紛失・災害時も確実に保護。
          </p>
        </div>
      </div>
    </div>

    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; font-size:11px; color:#64748b;">
      ※ 国税庁・法務省・経済産業省・総務省の各ガイドラインに沿った設計となっております。
    </div>

    <div class="page-footer">
      <span>デンケイ (Denkei) サービス紹介資料</span>
      <span class="page-number">6 / 10</span>
    </div>
  </div>

  <!-- ==================== PAGE 7: 競合・他社比較 ==================== -->
  <div class="page">
    <div class="page-header">
      <div class="header-logo">
        <img src="${mascotCircleDataUri}" alt="Logo">
        <span class="header-logo-text">Denkei</span>
        <span class="header-subtitle">| サービス資料</span>
      </div>
      <div class="header-badge">06. 競合比較</div>
    </div>

    <span class="section-tag">Comparison</span>
    <h2 class="page-title">大手電子契約サービスとの徹底比較</h2>
    <p class="page-desc">他社サービスが中小企業にとって「高すぎる」「複雑すぎる」理由と、デンケイの優位性。</p>

    <table class="styled-table" style="margin-bottom: 14px;">
      <thead>
        <tr>
          <th style="width: 25%;">比較項目</th>
          <th style="width: 25%; background:#e0f2fe; color:#0369a1; font-size:12.5px;">デンケイ (Denkei)</th>
          <th style="width: 25%;">大手電子契約 A社</th>
          <th style="width: 25%;">大手電子契約 B社</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>月額基本料金</strong></td>
          <td style="background:#f0f9ff; font-weight:700; color:#0284c7;">2,980円 (税込)</td>
          <td>11,000円〜 (税別)</td>
          <td>30,000円〜 (税別)</td>
        </tr>
        <tr>
          <td><strong>月間無料枠</strong></td>
          <td style="background:#f0f9ff; font-weight:700; color:#0284c7;">100件 / 月</td>
          <td>0件（即従量課金）</td>
          <td>0件（即従量課金）</td>
        </tr>
        <tr>
          <td><strong>超過・追加送信</strong></td>
          <td style="background:#f0f9ff; font-weight:700; color:#0284c7;">勝手課金なし（チケット/上位移行）</td>
          <td>220円 / 通（即自動従量課金）</td>
          <td>110円〜220円 / 通（即自動従量課金）</td>
        </tr>
        <tr>
          <td><strong>相手先アカウント登録</strong></td>
          <td style="background:#f0f9ff; font-weight:700; color:#15803d;">完全不要（1クリック）</td>
          <td>一部プランで必要</td>
          <td>不要</td>
        </tr>
        <tr>
          <td><strong>タイムスタンプ追加費用</strong></td>
          <td style="background:#f0f9ff; font-weight:700; color:#15803d;">0円 (ハッシュチェーン)</td>
          <td>月額・従量に含まれる</td>
          <td>別途費用または従量</td>
        </tr>
        <tr>
          <td><strong>電帳法・インボイス対応</strong></td>
          <td style="background:#f0f9ff; font-weight:700; color:#15803d;">標準完全対応</td>
          <td>上位プランのみ対応</td>
          <td>オプション追加費用</td>
        </tr>
        <tr>
          <td><strong>年間コスト（月50件利用時）</strong></td>
          <td style="background:#e0f2fe; font-weight:800; color:#0369a1; font-size:13px;">35,760円</td>
          <td>約 264,000円</td>
          <td>約 492,000円</td>
        </tr>
      </tbody>
    </table>

    <div class="card" style="background:#eff6ff; border-color:#93c5fd; padding:12px 18px;">
      <h3 style="margin:0 0 4px 0; font-size:13px; font-weight:700; color:#1e40af;">
        📊 年間コストが「約23万〜45万円」削減されます
      </h3>
      <p style="font-size:11.5px; color:#1e3a8a; margin:0;">
        月間50件〜100件程度の契約を締結する企業様の場合、大手サービスに支払う費用の<strong>約85%〜90%を削減</strong>可能。浮いた予算を本来の事業投資や人材採用に回すことができます。
      </p>
    </div>

    <div class="page-footer">
      <span>デンケイ (Denkei) サービス紹介資料</span>
      <span class="page-number">7 / 10</span>
    </div>
  </div>

  <!-- ==================== PAGE 8: 料金プラン ==================== -->
  <div class="page">
    <div class="page-header">
      <div class="header-logo">
        <img src="${mascotCircleDataUri}" alt="Logo">
        <span class="header-logo-text">Denkei</span>
        <span class="header-subtitle">| サービス資料</span>
      </div>
      <div class="header-badge">07. 料金プラン</div>
    </div>

    <span class="section-tag">Pricing</span>
    <h2 class="page-title">透明でわかりやすいシンプルな料金体系</h2>
    <p class="page-desc">初期費用0円、契約縛りなし。企業の成長ステージに合わせてお選びいただけます。</p>

    <div class="grid-3" style="margin-bottom:14px;">
      <!-- 無料プラン -->
      <div class="card" style="display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <span class="pill pill-blue" style="margin-bottom:8px;">お試し</span>
          <h3 style="margin:0 0 6px 0; font-size:16px; font-weight:700; color:#0f172a;">フリープラン</h3>
          <div style="font-size:24px; font-weight:800; color:#0f172a; margin-bottom:10px;">
            0円 <span style="font-size:11px; font-weight:400; color:#64748b;">/ 月</span>
          </div>
          <ul class="check-list" style="margin-bottom:14px;">
            <li>月間締結枠: <strong>3件</strong></li>
            <li>ユーザー数: 1名</li>
            <li>基本署名機能</li>
            <li>合意締結証明書発行</li>
          </ul>
        </div>
        <div style="font-size:10.5px; color:#64748b; background:#f8fafc; padding:8px; border-radius:6px; text-align:center;">
          操作感の検証に最適
        </div>
      </div>

      <!-- スタンダードプラン（一番人気） -->
      <div class="card" style="border:2px solid #0284c7; box-shadow:0 4px 12px rgba(2, 132, 199, 0.15); display:flex; flex-direction:column; justify-content:space-between; position:relative;">
        <div style="position:absolute; top:-10px; right:12px; background:#0284c7; color:#fff; font-size:9.5px; font-weight:700; padding:2px 8px; border-radius:10px;">
          おすすめ / 一番人気
        </div>
        <div>
          <span class="pill pill-green" style="margin-bottom:8px;">中小企業標準</span>
          <h3 style="margin:0 0 6px 0; font-size:16px; font-weight:700; color:#0284c7;">スタンダード</h3>
          <div style="font-size:24px; font-weight:800; color:#0284c7; margin-bottom:10px;">
            2,980円 <span style="font-size:11px; font-weight:400; color:#64748b;">/ 月 (税込)</span>
          </div>
          <ul class="check-list" style="margin-bottom:14px;">
            <li>月間締結枠: <strong>100件</strong>（年払いは120件）</li>
            <li>勝手課金なし・安心安全設計</li>
            <li>ユーザー数: <strong>3名まで</strong></li>
            <li>電帳法事務処理規程キット</li>
            <li>会社角印・代表取締役丸印</li>
            <li>年間適格請求書（T番号領収書）</li>
          </ul>
        </div>
        <div style="font-size:10.5px; color:#0369a1; background:#e0f2fe; padding:8px; border-radius:6px; text-align:center; font-weight:600;">
          95%以上の企業様がこちらを選択
        </div>
      </div>

      <!-- ビジネスプラン -->
      <div class="card" style="display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <span class="pill pill-amber" style="margin-bottom:8px;">大量送信・ワークフロー</span>
          <h3 style="margin:0 0 6px 0; font-size:16px; font-weight:700; color:#0f172a;">ビジネス</h3>
          <div style="font-size:24px; font-weight:800; color:#0f172a; margin-bottom:10px;">
            6,980円 <span style="font-size:11px; font-weight:400; color:#64748b;">/ 月 (税込)</span>
          </div>
          <ul class="check-list" style="margin-bottom:14px;">
            <li>月間締結枠: <strong>無制限（使い放題）</strong></li>
            <li>送信前 承認フロー機能</li>
            <li>CSV一括送信機能</li>
            <li>ユーザー数: <strong>無制限</strong></li>
            <li>スタンダードの全機能</li>
          </ul>
        </div>
        <div style="font-size:10.5px; color:#64748b; background:#f8fafc; padding:8px; border-radius:6px; text-align:center;">
          社内回議・大量契約に最適
        </div>
      </div>
    </div>

    <div class="card" style="background:#f8fafc;">
      <h3 style="margin:0 0 6px 0; font-size:12.5px; font-weight:700; color:#334155;">よくあるご質問（料金・契約）</h3>
      <div class="grid-2" style="font-size:11px; color:#475569;">
        <div>
          <strong>Q. 初期費用や解約金はかかりますか？</strong><br>
          A. 一切かかりません。初期費用0円、いつでもマイページから1クリックで解約可能です。
        </div>
        <div>
          <strong>Q. 契約件数が余った場合、翌月に繰り越せますか？</strong><br>
          A. 月間枠（100件）は毎月1日にリフレッシュされます。追加枠購入分は永続有効です。
        </div>
      </div>
    </div>

    <div class="page-footer">
      <span>デンケイ (Denkei) サービス紹介資料</span>
      <span class="page-number">8 / 10</span>
    </div>
  </div>

  <!-- ==================== PAGE 9: 導入事例・ユースケース ==================== -->
  <div class="page">
    <div class="page-header">
      <div class="header-logo">
        <img src="${mascotCircleDataUri}" alt="Logo">
        <span class="header-logo-text">Denkei</span>
        <span class="header-subtitle">| サービス資料</span>
      </div>
      <div class="header-badge">08. 活用事例</div>
    </div>

    <span class="section-tag">Case Studies</span>
    <h2 class="page-title">様々な業種での業務効率化・コスト削減実績</h2>
    <p class="page-desc">IT・製造・建設・不動産・サービス業など、幅広い中小企業で活用されています。</p>

    <div class="grid-2" style="margin-bottom:14px;">
      <div class="card">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
          <strong style="color:#0284c7; font-size:12px;">建設・工務店（従業員25名）</strong>
          <span class="pill pill-green">年間32万円削減</span>
        </div>
        <h3 style="margin:0 0 8px 0; font-size:13.5px; font-weight:700; color:#0f172a;">
          下請け業者・職人との個別発注書締結
        </h3>
        <p style="font-size:11px; color:#64748b; margin:0 0 8px 0;">
          現場に出ている職人さん宛にスマホで送信。アプリ登録不要なため「スマホでポンと押すだけ」と現場からも大好評。郵送費用の削減に加え、着工前の確実な書面合意が定着しました。
        </p>
        <div style="font-size:10.5px; color:#334155; background:#f1f5f9; padding:6px 10px; border-radius:4px;">
          効果: 締結までの期間 7日間 → <strong>当日中（平均2時間）</strong>
        </div>
      </div>

      <div class="card">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
          <strong style="color:#0284c7; font-size:12px;">IT・WEB制作（従業員10名）</strong>
          <span class="pill pill-green">年間18万円削減</span>
        </div>
        <h3 style="margin:0 0 8px 0; font-size:13.5px; font-weight:700; color:#0f172a;">
          フリーランスとの業務委託契約・NDA
        </h3>
        <p style="font-size:11px; color:#64748b; margin:0 0 8px 0;">
          大手ツールの月額費用に悩まされていたところデンケイへ移行。テンプレート機能により発注業務が自動化され、月額固定費を1/4以下に圧縮することに成功しました。
        </p>
        <div style="font-size:10.5px; color:#334155; background:#f1f5f9; padding:6px 10px; border-radius:4px;">
          効果: 契約管理工数 <strong>80%削減</strong>、印紙代ゼロ化
        </div>
      </div>

      <div class="card">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
          <strong style="color:#0284c7; font-size:12px;">士業・コンサルティング（従業員5名）</strong>
          <span class="pill pill-green">成約率20%向上</span>
        </div>
        <h3 style="margin:0 0 8px 0; font-size:13.5px; font-weight:700; color:#0f172a;">
          顧問契約書および秘密保持契約（NDA）
        </h3>
        <p style="font-size:11px; color:#64748b; margin:0 0 8px 0;">
          オンライン面談終了後、すぐにデンケイから契約書を発行。見込み顧客の熱量が高いその場で締結に至るため、検討離脱を大幅に防止できるようになりました。
        </p>
        <div style="font-size:10.5px; color:#334155; background:#f1f5f9; padding:6px 10px; border-radius:4px;">
          効果: 面談からの成約スピード <strong>即日締結</strong>
        </div>
      </div>

      <div class="card">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
          <strong style="color:#0284c7; font-size:12px;">人材紹介・派遣（従業員40名）</strong>
          <span class="pill pill-green">年間60時間短縮</span>
        </div>
        <h3 style="margin:0 0 8px 0; font-size:13.5px; font-weight:700; color:#0f172a;">
          雇用契約書・入社承諾書の一括送信
        </h3>
        <p style="font-size:11px; color:#64748b; margin:0 0 8px 0;">
          新入社員やアルバイト採用時の雇用条件通知書・誓約書をバルク送信。返送の催促や書類ファイリングの手間が完全にゼロになり、人事担当者の残業が激減しました。
        </p>
        <div style="font-size:10.5px; color:#334155; background:#f1f5f9; padding:6px 10px; border-radius:4px;">
          効果: 回収率 <strong>100%</strong> 達成、催促工数の撤廃
        </div>
      </div>
    </div>

    <div class="page-footer">
      <span>デンケイ (Denkei) サービス紹介資料</span>
      <span class="page-number">9 / 10</span>
    </div>
  </div>

  <!-- ==================== PAGE 10: 導入ステップ・お問い合わせ ==================== -->
  <div class="page" style="justify-content:space-between;">
    <div>
      <div class="page-header">
        <div class="header-logo">
          <img src="${mascotCircleDataUri}" alt="Logo">
          <span class="header-logo-text">Denkei</span>
          <span class="header-subtitle">| サービス資料</span>
        </div>
        <div class="header-badge">09. 導入の流れ・お問い合わせ</div>
      </div>

      <span class="section-tag">Next Steps</span>
      <h2 class="page-title">最短即日スタート！導入までの流れ</h2>
      <p class="page-desc">面倒な書類審査や営業担当との面談は不要。今すぐ無料でお試しいただけます。</p>

      <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:18px;">
        <div class="card" style="display:flex; gap:14px; align-items:center;">
          <div class="step-num">1</div>
          <div style="flex:1;">
            <div style="font-weight:700; font-size:13px; color:#0f172a;">WEBからアカウント登録（1分）</div>
            <div style="font-size:11px; color:#64748b;">メールアドレスとパスワードを入力するだけ。クレジットカード登録も不要です。</div>
          </div>
        </div>

        <div class="card" style="display:flex; gap:14px; align-items:center;">
          <div class="step-num">2</div>
          <div style="flex:1;">
            <div style="font-weight:700; font-size:13px; color:#0f172a;">テスト契約書の作成・自己送信</div>
            <div style="font-size:11px; color:#64748b;">自社のPDFをアップロードし、ご自身のスマホ宛にテスト送信して署名体験をご確認ください。</div>
          </div>
        </div>

        <div class="card" style="display:flex; gap:14px; align-items:center;">
          <div class="step-num">3</div>
          <div style="flex:1;">
            <div style="font-weight:700; font-size:13px; color:#0f172a;">実運用開始 & プラン変更</div>
            <div style="font-size:11px; color:#64748b;">納得いただけましたらスタンダードプラン（月2,980円）に切り替え、取引先との契約を開始。</div>
          </div>
        </div>
      </div>

      <!-- お問い合わせ・サポート案内 -->
      <div class="card" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color:#fff; padding:20px; border:none; text-align:center;">
        <div style="font-size:11px; color:#38bdf8; font-weight:700; letter-spacing:1px; margin-bottom:6px;">
          START YOUR SMART CONTRACTS TODAY
        </div>
        <h3 style="font-size:18px; font-weight:800; color:#fff; margin:0 0 10px 0;">
          今すぐデンケイで、スマートな契約業務をはじめましょう
        </h3>
        <p style="font-size:11.5px; color:#94a3b8; margin:0 0 16px 0;">
          ご不明点やプランのご相談、専用環境構築のご要望など、お気軽にお問い合わせください。
        </p>

        <div style="display:inline-flex; gap:20px; background:rgba(255,255,255,0.08); padding:10px 24px; border-radius:8px; border:1px solid rgba(255,255,255,0.15);">
          <div>
            <div style="font-size:10px; color:#94a3b8;">サービスサイト・新規登録</div>
            <div style="font-size:13px; font-weight:700; color:#38bdf8; font-family:'Outfit',sans-serif;">https://contracts.denkei.jp</div>
          </div>
          <div style="border-left:1px solid rgba(255,255,255,0.2); padding-left:20px;">
            <div style="font-size:10px; color:#94a3b8;">導入サポート窓口</div>
            <div style="font-size:13px; font-weight:700; color:#ffffff; font-family:'Outfit',sans-serif;">support@denkei.jp</div>
          </div>
        </div>
      </div>
    </div>

    <div style="text-align:center; font-size:10px; color:#94a3b8; padding-top:6mm;">
      © 2026 株式会社デンケイ (Denkei). All Rights Reserved. 電子帳簿保存法・インボイス制度準拠
    </div>

    <div class="page-footer">
      <span>デンケイ (Denkei) サービス紹介資料</span>
      <span class="page-number">10 / 10</span>
    </div>
  </div>

</body>
</html>
`;

const htmlFilePath = path.resolve(__dirname, 'brochure.html');
const pdfFilePath = path.resolve(__dirname, 'denkei-service-guide.pdf');

fs.writeFileSync(htmlFilePath, htmlContent, 'utf-8');
console.log('HTML written to:', htmlFilePath);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`file://${htmlFilePath.replace(/\\\\/g, '/')}`, { waitUntil: 'networkidle' });

  // Wait for webfonts to load
  await page.evaluateHandle('document.fonts.ready');

  await page.pdf({
    path: pdfFilePath,
    format: 'A4',
    printBackground: true,
    margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
  });

  await browser.close();
  console.log('PDF generated successfully at:', pdfFilePath);
})();
