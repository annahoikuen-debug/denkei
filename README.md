# デンケイ (Denkei) - 日本の中小企業向け電子契約・電子署名プラットフォーム

デジタル契約を、誰でも簡単に。中小企業向け低コスト・単一コンテナ構成のオープンソース電子契約サービスです。

<p align="center" style="margin-top: 20px">
  <a href="README.md">プロジェクト概要</a> ·
  <a href="USER_MANUAL.md">ユーザーマニュアル</a> ·
  <a href="Q&A.md">よくある質問</a> ·
  <a href="OPERATIONS_MANUAL.md">運用者マニュアル</a> ·
  <a href="OPERATOR_TODO.md">運用者ToDoリスト</a>
</p>

<p align="center">
   <a href="https://github.com/documenso/documenso/stargazers"><img src="https://img.shields.io/github/stars/documenso/documenso" alt="Github Stars"></a>
   <a href="https://github.com/documenso/documenso/pulse"><img src="https://img.shields.io/github/commit-activity/m/documenso/documenso" alt="Commits-per-month"></a>
   <a href="https://github.com/documenso/documenso/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-AGPLv3-purple" alt="License"></a>
   <a href="CODE_OF_CONDUCT.md"><img src="https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg" alt="Contributor Covenant"></a>
</p>

## デンケイとは

デンケイ（Denkei）は、電子契約・電子署名をシンプルかつ低コストで利用できるオープンソースプラットフォームです。DocuSign のオープンソース代替として開発され、**日本の中小企業（SMB）向けに最適化**されています。

### ランディングページのキャッチコピー

> **中小企業のための、一番割り切れる電子契約。**
> タイムスタンプ不要・国税庁公認の事務処理規程つき。月額2,980円（100件定額）、相手方はスマホ10秒押印。

### 主な特徴

| 特徴 | 内容 |
|------|------|
| **日本語フル対応** | 画面・メール・日付（和暦／西暦）・氏名（姓・名分離）など、日本のビジネス慣習に合わせたUI |
| **低コスト構成** | Redis・有料TSA・従量課金SMSなどの外部依存を排除。PostgreSQL 1台＋アプリ 1台で契約あたり原価約 0.2〜0.5円、月額 2,980 円（月 100 件）運用を実現 |
| **日本法対応** | 電子署名法・民法・電子帳簿保存法の要件を技術的に満たす実装（PAdES署名、ハッシュチェーン監査ログ、締結証明書、CSVエクスポート、インボイス制度対応領収書等） |
| **セルフホスティング可能** | Docker コンテナ 1 つで起動。AGPLv3 オープンソースでソースコードを自由に監査・改変可能 |
| **電子署名法準拠の本人確認** | メールOTP、WebAuthn/Passkeys、2FA など多要素認証に対応 |
| **月額定額課金** | Stripe 連携による 3 プラン（FREE/STANDARD/BUSINESS）のサブスクリプション課金 |

### デンケイの「七つ道具」（公式ランディングページより）

| 道具 | 概要 |
|------|------|
| 1. スマホ10秒 電子認印（赤丸印） | 相手方はアカウント登録・アプリ導入不要。スマホで開いてワンタップで朱肉認印が自動押印 |
| 2. 国税庁公認・事務処理規程キット | 貴社名入り規程をワンクリック生成・ダウンロード。電帳法第4条に完全準拠 |
| 3. 改ざん防止 WORM監査ログ＆SHA-256ハッシュ | DB層に WORM トリガー。SHA-256 ハッシュチェーンで改ざん即検知 |
| 4. メールワンタイム認証（OTP 二要素認証） | 6桁 OTP でなりすましを防止。IP・UA・認証時刻を監査ログ完全記録 |
| 5. インボイス適格請求書（T番号対応） | T+13桁登録番号・10%消費税額を記載した帳票をワンクリック出力 |
| 6. 従量課金の恐怖ゼロ・月額2,980円定額（100件） | 大手の「1件220円課金」なし。月々更新・いつでも解約可能 |
| 7. 年間コスト削減シミュレーター | 月間契約書件数を入力すると、紙契約との年間コスト削減額と削減時間を即時試算 |

### コスト診断シミュレーター（公式ランディングページより）

紙の契約書（印紙代平均400円＋製本印刷200円＋定形郵送110円＝約710〜920円/通、1通あたり約12分の事務作業）との比較試算。月間契約書件数を入力すると、年間コスト削減額と削減作業時間が瞬時に表示されます。月30件の場合で年間約21.1万円、月100件で年間約39.6万円の大手他社費用と比較して、デンケイならスタンダード月額2,980円（年間35,760円）で約83%〜91%のコスト削減となります。

### 日本語・日本法対応の実装一覧

| 機能 | 実装ファイル | 概要 |
|------|-------------|------|
| 和暦（令和）日付 | `packages/lib/universal/wareki-date.ts` | `toWareki()` で「令和X年M月D日」に変換 |
| 姓・名分離入力 | `packages/lib/universal/japanese-name.ts` | `joinJapaneseName()` / `splitJapaneseName()` |
| 円金額フォーマット | `packages/lib/universal/format-currency.ts` | `formatJpy()` / `formatJpyWithTaxIncluded()` |
| 電子印影（丸印・認印） | `packages/lib/universal/seal-image.ts` | `generateElectronicSealDataUrl()` でHanko風画像生成 |
| 適格請求書（インボイス） | `packages/lib/universal/qualified-invoice.ts` | 10%消費税計算・HTML請求書生成・T番号検証・年払い適格領収書 |
| 電帳法コンプライアンスキット | `packages/lib/universal/compliance-kit.ts` | 事務処理規程テンプレート生成・NTAチェックリスト |
| 電帳法適合3問診断 | `packages/lib/universal/compliance-diagnostics.ts` | 国税庁告示根拠条文の即時判定カードコンポーネント |
| 取引先安心配布キット | `packages/lib/universal/counterparty-guide.ts` | 相手方向けA4印刷対応・メール案内文・法的根拠キット |
| オンボーディングチェックリスト | `packages/lib/universal/onboarding-checklist.ts` | 4ステップ進行バナーと初期導入支援ウィジェット |
| 自立型3秒セルフヘルプ | `packages/lib/universal/self-help-guide.ts` | 署名受領者向け3大トラブル（OTP・Safari・通知）即時解決 |
| 年払い一括＆適格請求書 | `packages/lib/server-only/pdf/generate-annual-invoice-pdf.ts` | 年29,760円（実質2ヶ月無料）と1クリックPDF |
| プラン定義・制限ゲート | `packages/lib/constants/plans.ts` | FREE/STANDARD/BUSINESS 3プラン・月次/年次枠管理 |
| チームプラン情報取得 | `packages/lib/server-only/team/get-team-plan.ts` | プラン判定・送信上限チェック・機能ゲート |
| 翻訳漏れ検出 | `scripts/check-translations.mjs` | `ja/web.po` の未訳エントリ検出 |
| 日本語日付フィールド | `jp-core-signing-flow.spec.ts` | E2E: `yyyy年M月d日` 形式のDATEフィールド検証 |
| ドキュメントメタ既定日本語 | `migrations/20261015000000_ja_default_document_meta/` | `DocumentMeta.language='ja'` / `timezone='Asia/Tokyo'` |
| 負荷テスト | `scripts/load-test-burst.ts` | 100件バースト耐性テスト（エラー率0.00%、p95 294ms） |
| ランディングページ | `apps/remix/app/components/general/landing-page.tsx` | スマホ認印デモ・電帳法診断・コスト試算・年払いトグル |
| 組織請求書テーブル | `apps/remix/app/components/tables/organisation-billing-invoices-table.tsx` | Stripe 適格請求書（インボイス）表示・ダウンロード |

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| 言語 | TypeScript |
| フロントエンド | React 19, React Router v7 (Remix) |
| サーバー | Hono |
| データベース | PostgreSQL 15, Prisma ORM, Kysely |
| API | tRPC (v2/内部), ts-rest (v1), OpenAPI |
| スタイリング | Tailwind CSS, Radix UI, shadcn/ui |
| PDF 表示・操作 | pdf.js, @libpdf/core, pdf-lib |
| 電子署名 | PAdES (ETSI.CAdES.detached), RFC 3161 TSA |
| メール | React Email, Nodemailer |
| 国際化 | Lingui (日本語標準) |
| ジョブキュー | PostgreSQL 内蔵 (local), Inngest, BullMQ |
| ストレージ | データベース内包, S3互換 |
| 決済 | Stripe (JPY サブスクリプション) |
| リンター・フォーマッタ | Biome |
| E2Eテスト | Playwright |
| ビルドツール | Turborepo, Vite |

## リポジトリ構造（モノレポ）

```
denkei/
├── apps/
│   ├── remix/          # メインWebアプリ (React Router + Hono, ポート3000)
│   ├── openpage-api/   # 公開アナリティクスAPI (ポート3003)
│   └── docs/           # ドキュメントサイト (ポート3004)
├── packages/
│   ├── lib/            # コアビジネスロジック (server-only/client-only/universal)
│   ├── prisma/         # データベーススキーマ・クライアント・マイグレーション
│   ├── trpc/           # tRPC APIレイヤー (OpenAPI対応)
│   ├── api/            # REST APIレイヤー (ts-rest)
│   ├── ui/             # UIコンポーネントライブラリ (shadcn + Radix + Tailwind)
│   ├── email/          # メールテンプレート・メーラー (React Email)
│   ├── auth/           # 認証 (OAuth, WebAuthn/Passkeys)
│   ├── signing/        # PDF電子署名 (P12 / Google Cloud HSM)
│   ├── ee/             # Enterprise Edition 機能
│   └── assets/         # 静的アセット
├── docker/             # Docker設定 (スタンドアロン / 本番)
├── docs/plans/         # 実装計画書 (phase1, remaining-tasks, smb-cutdown 等)
├── scripts/            # check-translations.mjs, load-test-burst.ts 等
└── package.json        # ルートワークスペース設定
```

## 主要機能

| 機能 | 概要 |
|------|------|
| 文書アップロード | PDFファイルのアップロード・プレビュー (DOCX変換オプション) |
| 受取人設定 | 複数受取人への送信順序・署名フィールド配置 |
| 電子署名 | 手書き署名、タイプド署名、PAdES準拠デジタル署名、電子印影 |
| エンベロープ | 複数文書をまとめて送信するエンベロープ機能 |
| テンプレート | よく使う文書のテンプレート化・再利用 |
| フォルダ管理 | 文書のフォルダ分類・整理 |
| 監査ログ | すべての操作を記録した改ざん検知可能な監査ログ (ハッシュチェーン、WORMトリガー) |
| 締結証明書 | 署名完了時に締結証明書PDFを自動生成・同梱 |
| 電子帳簿保存法対応 | 取引先名・金額・日付の検索メタデータ、CSVエクスポート、事務処理規程テンプレート |
| 和暦対応 | 令和等の和暦日付表示・入力 |
| 姓・名分離 | 日本の氏名入力慣習に対応 (姓 / 名 の分離入力) |
| インボイス制度 | 適格請求書・領収書の自動生成 (10%消費税計算、T番号検証) |
| 認証 | メールOTP、Google OAuth、Microsoft OAuth、OIDC、WebAuthn/Passkeys、2FA、Firebaseメール認証 |
| 決済 | Stripe による課金・サブスクリプション管理 (3プラン) |
| プラン制限ゲート | 月次送信上限チェック・超過ブロック・アップグレード導線 |
| シングルサインオン | 組織認証ポータル、SSO (EE) |

## クイックスタート（開発環境）

### 必要条件

- Node.js v24 以上
- PostgreSQL データベース
- Docker (オプション、開発用データベース・メールサーバー起動用)

### 1. リポジトリをクローン

```bash
git clone https://github.com/annahoikuen-debug/denkei.git
cd denkei/denkei
```

### 2. 環境変数を設定

```bash
cp .env.example .env
```

`.env` ファイルを開き、必要に応じて値を編集してください。最低限以下を設定してください：

- `NEXTAUTH_SECRET` - 認証用シークレット (32文字以上のランダム文字列)
- `NEXT_PRIVATE_ENCRYPTION_KEY` - 暗号化鍵 (32文字以上)
- `NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY` - 二次暗号化鍵 (32文字以上)
- `NEXT_PRIVATE_DATABASE_URL` - データベース接続URL

### 3. 依存関係をインストール

```bash
npm ci
```

### 4. データベースをセットアップ

Docker を使用する場合：

```bash
npm run dx:up       # PostgreSQL と Inbucket (メールテストサーバー) を起動
npm run prisma:migrate-dev   # マイグレーションを適用
npm run prisma:seed          # シードデータを投入
```

### 5. 開発サーバーを起動

```bash
npm run dev
```

アプリケーションは `http://localhost:3000` で起動します。

### ワンコマンドセットアップ

Docker がインストールされている場合、以下の 1 コマンドで全セットアップが完了します：

```bash
npm run d
```

これは依存関係インストール、Docker サービス起動、マイグレーション、シード投入、翻訳コンパイル、開発サーバー起動を一括で実行します。

### アクセスポイント

| サービス | URL | 説明 |
|---------|-----|------|
| メインアプリ | http://localhost:3000 | デンケイ本体 |
| ランディングページ | http://localhost:3000/lp | 七つ道具 |
| インバケット (メール確認) | http://localhost:9000 | 開発用送信メールをWebで確認 |
| データベース | localhost:54320 | PostgreSQL (Docker経由) |

## Docker でのデプロイ（セルフホスティング）

### スタンドアロン構成（SMB向け低コスト）

外部Redis・有料TSAを不要とし、PostgreSQL＋アプリの 2 コンテナで最小構成で動作します。

```bash
# スタンドアロン構成を起動
docker compose -f docker/compose.standalone.yml up -d

# ログを確認
docker compose -f docker/compose.standalone.yml logs -f app
```

起動後、自動的に Prisma マイグレーションが適用され、`http://localhost:3000` で利用可能になります。

### 本番構成

```bash
docker compose -f docker/production/compose.yml up -d
```

### 環境変数の主な設定項目

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `NEXT_PUBLIC_UPLOAD_TRANSPORT` | ストレージプロバイダ | `database` |
| `NEXT_PRIVATE_SIGNING_TRANSPORT` | 署名トランスポート | `local` |
| `NEXT_PRIVATE_SIGNING_ENABLE_TSA` | 外部タイムスタンプ局利用 | `false` |
| `NEXT_PRIVATE_IDENTITY_PROVIDER` | 本人確認プロバイダ | `otp` |
| `NEXT_PRIVATE_JOBS_PROVIDER` | ジョブキュープロバイダ | `local` |
| `NEXT_PRIVATE_SMTP_TRANSPORT` | メール送信プロバイダ | `smtp-auth` |
| `PORT` | サーバー待受ポート | `3000` |
| `NEXT_PRIVATE_STRIPE_API_KEY` | Stripe APIキー | - |
| `NEXT_PRIVATE_STRIPE_WEBHOOK_SECRET` | Stripe Webhookシークレット | - |
| `NEXT_PRIVATE_STRIPE_PRICE_ID_STANDARD` | STANDARDプランのStripe Price ID | - |
| `NEXT_PRIVATE_STRIPE_PRICE_ID_BUSINESS` | BUSINESSプランのStripe Price ID | - |

詳細な設定は `.env.example` および `docker/README.md`、`OPERATIONS_MANUAL.md` を参照してください。

### ワンクリックデプロイ

Railway、Render、Koyeb、Elestio などへのワンクリックデプロイボタンが用意されています。詳細はリポジトリの README または各プロバイダーのドキュメントを参照してください。

## ユーザー向けマニュアル

日常的な操作手順については `USER_MANUAL.md` を参照してください。文書の作成・送信・署名、テンプレート利用、チーム管理、プラン・課金など、エンドユーザー向けの手順をステップバイステップで解説しています。

## 運用者向けマニュアル

デプロイ・運用・バックアップ・アップグレード・課金運用などについては `OPERATIONS_MANUAL.md` を参照してください。導入・運用開始後に実施すべき作業のチェックリストは `OPERATOR_TODO.md` を参照してください。

## よくある質問 (Q&A)

運用中によくある質問とその回答については `Q&A.md` を参照してください。

## セキュリティ

脆弱性を発見した場合は、公開の Issue ではなく、[GitHub Security Advisories](https://github.com/annahoikuen-debug/denkei/security/advisories/new) または `security@documenso.com` まで非公開で報告してください。詳細なポリシーは `SECURITY.md` を参照してください。

## 日本法における法的根拠

デンケイは、日本の電子署名法・民法・電子帳簿保存法の要件を満たす実装を備えています。詳細は `LEGAL_BASIS_JP.md` を参照してください。

## ライセンス

このプロジェクトは [GNU AGPL v3](LICENSE) の下で公開されています。ネットワーク経由で利用する場合もソースコードの開示義務があります。

## コントリビュート

バグ報告や機能提案は [Issue](https://github.com/annahoikuen-debug/denkei/issues) で受け付けています。プルリクエストについては `CONTRIBUTING.md` および `CLA.md` を参照してください。

> 注意: 外部からのプルリクエストは、信頼できるコントリビューターに限って受け付けています。詳細は [なぜ外部プルリクエストを一時停止しているか](https://documenso.com/blog/why-we-re-pausing-external-pull-requests) を参照してください。

## お問い合わせ

エンタープライズプランや大規模導入に関するご相談は、以下のカレンダーよりご予約ください。

<a href="https://cal.com/timurercan/enterprise-customers?utm_source=banner&utm_campaign=oss"><img alt="Book us with Cal.com" src="https://cal.com/book-with-cal-dark.svg" /></a>

---

デンケイは Documenso プロジェクトをベースに、日本の中小企業向けに最適化されたフォークプロジェクトです。
