# 残タスク詳細実装計画書(フェーズ1〜3 精査結果に基づく)

> **改訂**: `code_artifact.md`(開発検討ログ)の志向を反映した改善案1〜5を統合。
> - 案1: ストレージを Cloudflare R2(S3互換)に寄せて従量費を最小化 → ステップ20に統合
> - 案2: TSA を一般/認定の2段階プロバイダ切替+回数集計にする → ステップ11に統合
> - 案3: 完了後 N 日経過で PDF 本体を論理削除する「データ保持期間」設定 → ステップ14を拡張
> - 案4: 監査ログテーブルへの UPDATE/DELETE を DB トリガーで拒否(WORM) → ステップ14に統合
> - 案5: テンプレート側で「全受取人にメールOTP必須」を既定化(secure by default) → ステップ5に統合
> (案6〜9: 免責明文化/キャラクターブランディング/コスト可視化/AcroForm自動検出は Stage E のドキュメント整備・拡張候補として記録)

| 項目 | 内容 |
| --- | --- |
| 作成日 | 2026-10-15 |
| 根拠 | `phase1-plan-*` / `phase2-plan-*` / `phase3-plan-*` の各計画書とコードベースの突合結果 |
| 期間目安 | 4〜5週間(2〜3名想定) |
| ステップ数 | 22ステップ(Stage A〜E) |
| テスト方針 | 各Stageでリグレッションテストを併設。E2E は CI 実行を前提(ローカル Windows では `tsc --noEmit` + `biome check` を最低ラインとする) |

---

## 1. 精査結果サマリ(実装済み / 残タスクの判定)

### 1.1 フェーズ1(日本語UX・モバイル署名・法規制)—— **ほぼ完了**

確認された成果物:

| 領域 | 証拠ファイル |
| --- | --- |
| ja 既定化マイグレーション | `packages/prisma/migrations/20261015000000_ja_default_document_meta/` |
| 日付・金額フォーマット | `packages/lib/constants/date-formats.ts`、`packages/lib/universal/format-currency.ts`(+テスト) |
| 和暦 | `packages/lib/universal/wareki-date.ts`(+テスト) |
| 氏名(姓/名) | `packages/lib/universal/japanese-name.ts`(+テスト) |
| エラー ja マップ | `packages/lib/errors/app-error-ja.ts` |
| 翻訳チェック CI | `scripts/check-translations.mjs`、`scripts/fill-ja-translations.mjs`、`.github/workflows/translations-check.yml` |
| ウィザード | `apps/remix/app/routes/_authenticated+/t.$teamUrl+/new+/_index.tsx`、`jp-wizard-flow.spec.ts` |
| モバイル署名 | `signature-pad-draw.tsx` / `signature-pad-dialog.tsx` 改修、`jp-mobile-signing.spec.ts` |
| 監査ログハッシュチェーン | `20261015000001_add_audit_log_hash_chain/`、`document-audit-log-hash.ts`(+テスト) |
| 電帳法メタ | `20261015000002_add_electronic_ledger_meta/`、`electronic-ledger-csv.ts`(+テスト) |
| E2E | `jp-core-signing-flow.spec.ts` |

→ **残タスクなし**。ただし「締結証明書への本人確認結果反映」等はフェーズ2側で検証が必要(後述)。

### 1.2 フェーズ2(本人確認・アクセス制御・運用)—— **ほぼ完了、一部残あり**

確認された成果物:

| 領域 | 証拠ファイル |
| --- | --- |
| 認証タイプ拡張(EMAIL_OTP/FIREBASE_EMAIL) | `packages/lib/types/document-auth.ts`(+テスト) |
| OTP / Firebase プロバイダ | `packages/lib/server-only/otp/`(firebase-admin-client.ts、identity-verification-provider.ts) |
| eKYC モック | `packages/lib/server-only/ekyc/ekyc.ts`(MockEkycProvider) |
| レート制限 | `20260219141233_add_rate_limit_table/`、`20260529132406_add_org_rate_limits/` |
| トークン期限・ローテーション | `20260219091107_add_recipient_expirations/`、`20261016000000_add_recipient_verification_token/` |
| リマインダー設定 | `20260401000000_add_reminder_settings/`、`20260622120000_add_recipient_reminder_count/` |
| ジョブ | expire-recipients-sweep / process-signing-reminder / send-signing-reminders-sweep / seal-document-sweep が存在 |
| ダッシュボード | `dashboard-progress.ts`(+テスト)、`jp-dashboard.spec.ts` |
| E2E | `jp-otp-auth.spec.ts`、`jp-access-control.spec.ts`、`jp-reminder-expiry.spec.ts` |

**残タスク(R2)**:
- R2-1. 締結証明書への本人確認方式・検証日時の記載アサーション(PDFテキスト抽出 E2E)の完成度確認。
- R2-2. 1トークン1アクティブセッション制御(同時アクセス排他)の実装有無確認と E2E(2ブラウザコンテキスト)。
- R2-3. ダウンロード証明(完了PDFダウンロード履歴の証明書付記オプション)。

### 1.3 フェーズ3(テンプレート自動化・簡素化・課金)—— **部分実装、残タスク多数**

確認された成果物:

| 領域 | 証拠ファイル | 状態 |
| --- | --- | --- |
| 差し込み変数スキーマ | `packages/lib/types/merge-variables.ts`(+テスト)、`template-automation.ts` | ✅ 実装済み(ステップ2) |
| 差し込みエンジン | `packages/lib/server-only/template/merge.ts`(+テスト) | ✅ 実装済み(ステップ4)ただし**エンベロープ送信経路への統合は未確認** |
| CSV一括 | `bulk-send-csv.ts` / `validate-bulk-send-csv.ts`(+テスト)、`bulk-send-template.handler.ts`、`template-bulk-send-dialog.tsx`、`jp-bulk-send.spec.ts` | ⚠️ 既存CSV(recipient_N_email 形式)。**変数列の差し込み対応が未実装**(ステップ6の残) |
| 承認フロー | `packages/lib/server-only/envelope/approval-flow.ts`、schema の `APPROVER` ロール、`jp-template-automation.spec.ts` | ✅ サーバロジック実装済み。**承認UI(承認一覧・通知メール)の実装は未確認**(ステップ11の残) |
| プラン定義 | `packages/lib/constants/plans.ts`(FREE/STANDARD/BUSINESS、isFeatureEnabledForPlan、月次上限)、`jp-plan-gates.spec.ts` | ✅ 実装済み(ステップ26)。**送信経路へのゲート適用は未確認**(ステップ27の残) |
| 署名順固定 | `template-automation.ts` の signingOrderLock | ⚠️ 型定義のみ。**UI とウィザード反映が未実装**(ステップ9の残) |

**未実装(残タスク)**:
- ステップ3: テンプレート編集UIの変数挿入(「変数を追加」ボタン)
- ステップ5: 変数入力フォーム送信フロー(ウィザード間の自動生成フォーム)
- ステップ6(残): bulk-send ジョブの変数差し込み対応
- ステップ9: 署名順固定UI + ウィザード既定値反映
- ステップ11: 承認UI(一覧・承認/差し戻し操作)と ja 通知メール
- ステップ13: 日本語雛形テンプレートの seed(業務委託/NDA/雇用)
- ステップ17〜25: アーキテクチャ簡素化(棚卸し→組織階層UI削除→Embedding/EE除外→API v1廃止→ジョブ local 固定→ストレージ標準化→単一コンテナ→負荷テスト)
- ステップ27: プラン制限ゲートの送信経路適用+アラート
- ステップ28〜31: Stripe 3プラン設定・領収書PDF・料金ページ ja・お試し導線
- ステップ32〜36: 機能ゲート回帰・移行リハーサル・E2E全体・ドキュメント・リリース判定

---

## 2. 実装ステップ(残タスク 22ステップ)

### Stage A: テンプレート変数のUI・送信統合(ステップ1〜4、約5日)

**ステップ1. テンプレート編集UIへの変数挿入(想定: 1.5日)**
- 内容: テンプレートエディタに「変数を追加」ダイアログ(名前/jaラベル/型 text|number|date/必須)を設け、テキストフィールドのプレースホルダとして `{{変数名}}` を選択挿入できるようにする。変数定義は `ZTemplateAutomationSettingsSchema.mergeVariables`(`packages/lib/types/template-automation.ts`)に保存。
- 対象:
  - `packages/ui/primitives/template-flow/add-template-fields.tsx`(挿入UI)
  - 新規 `apps/remix/app/components/dialogs/template-merge-variable-dialog.tsx`
  - `packages/trpc/server/` テンプレートルート(automation settings の更新ミューテーション)
- 検証: E2E(テンプレートに変数付きフィールドを追加→保存→再表示で変数が保持)。Vitest(変数名重複・未定義参照の Zod 検証は既存テストで担保)。

**ステップ2. 変数入力フォーム送信フロー(想定: 1.5日)**
- 内容: テンプレートから「新規送信」した際、変数定義から入力フォームを自動生成する画面をウィザードのステップ間に挿入。react-hook-form + Zod(`ZMergeVariableValuesSchema`)で検証。
- 対象:
  - `apps/remix/app/routes/_authenticated+/t.$teamUrl+/new+/`(新規ステップルート)
  - 新規 `apps/remix/app/components/general/wizard/merge-variables-form.tsx`
- 検証: E2E(テンプレート選択→変数入力→送信→PDFに値が反映)。

**ステップ3. 差し込みエンジンの送信経路統合(想定: 1日)**
- 内容: 既存 `mergeText` / `mergeTexts`(`packages/lib/server-only/template/merge.ts`)を `create-document-from-template.ts` とエンベロープ送信経路に統合。未バインド変数検知時は送信ブロック(AppError ja メッセージ)。
- 対象: `packages/lib/server-only/template/create-document-from-template.ts`、`packages/lib/server-only/envelope/`(差し込み適用箇所)
- 検証: Vitest(バインド/未バインドでブロック/特殊文字エスケープ)+E2E。

**ステップ4. CSV一括送信の変数列対応(想定: 1日)**
- 内容: `bulk-send-template.handler.ts` を拡張し、CSV の可変列(`recipient_N_*` 以外)を変数値として `mergeTexts` にバインド。`validate-bulk-send-csv.ts` にテンプレート変数定義渡しの検証追加。行番号付き ja エラーレポートを維持。
- 対象: `packages/lib/jobs/definitions/internal/bulk-send-template.handler.ts`、`packages/lib/server-only/template/{bulk-send-csv,validate-bulk-send-csv}.ts`、`apps/remix/app/components/dialogs/template-bulk-send-dialog.tsx`(プレビュー)
- 検証: Vitest(変数列パース/部分失敗)+`jp-bulk-send.spec.ts` 拡張。

### Stage B: 署名順固定・承認UIの完成(ステップ5〜8、約4.5日)

**ステップ5. 署名順固定のUI実装+OTP必須既定化(想定: 1日)**
- 内容: テンプレート設定画面に「署名順を固定」トグル+「先方→自社/自社→先方」選択を追加(signingOrderLock)。ウィザード宛先入力ステップで既定値として反映し、固定時は順序変更を不可化。あわせて `automationSettings` に「全受取人にメールOTPを必須化(secure by default)」トグルを追加し、送信時に各 recipient の actionAuth に EMAIL_OTP を自動適用する(改善案5)。
- 対象: テンプレート設定UI(`add-template-settings.tsx`)、ウィザード(`new+/` ステップ2)、`packages/lib/server-only/template/create-document-from-template.ts`(固定適用)
- 検証: E2E(順序固定テンプレート→送信→先方署名完了後に自社欄が有効化)。

**ステップ6. 承認UIと通知(想定: 1.5日)**
- 内容: 承認者向けの「承認待ち」一覧と承認/差し戻し(理由入力)操作UIを追加。`approval-flow.ts` の `approveEnvelopeByRecipient` / 差し戻し関数を呼び出す tRPC ルートを新設。差し戻し時は DRAFT 復帰(既存実装済み)。
- 対象:
  - 新規 `apps/remix/app/routes/_authenticated+/approvals.tsx`(またはダッシュボード配下)
  - `packages/trpc/server/` 承認ルート(新規)
  - `packages/ui/` 承認操作コンポーネント
- 検証: E2E(承認→配信開始、差し戻し→下書き復帰)。

**ステップ7. 承認通知メールの ja 対応(想定: 0.5日)**
- 内容: 承認依頼・承認完了・差し戻しの react-email テンプレートを新規作成し、ジョブまたは同期送信で連携。DocumentMeta.language で ja 分岐。
- 対象: `packages/email/templates/`(新規 3 テンプレート)、`packages/lib/server-only/envelope/approval-flow.ts`(送信フック)
- 検証: E2E(Inbucket で ja メール受信確認)。

**ステップ8. 日本語雛形テンプレートの seed(想定: 1.5日)**
- 内容: 業務委託契約・NDA・雇用契約の ja 雛形(PDF+フィールド配置+変数定義+署名順固定+承認設定のサンプル)を seed スクリプトで同梱。
- 対象: `packages/prisma/seed` 関連、`assets/` に PDF 3種追加
- 検証: seed 実行→テンプレート一覧に表示→送信可能な E2E。

### Stage C: プランゲート適用・課金整備(ステップ9〜13、約6日)

**ステップ9. プラン制限ゲートの送信経路適用(想定: 1日)**
- 内容: `create-envelope` 相当ルートに月次送信数チェック(`isMonthlyLimitExceeded`、`packages/lib/constants/plans.ts`)を適用。超過時は AppError(ja)+アップグレード導線を表示。FEATURE ゲート(`isFeatureEnabledForPlan`)も bulkSend / approvalFlow 経路に適用。
- 対象: `packages/trpc/server/` create-envelope ルート、`packages/lib/server-only/envelope/`
- 検証: E2E(上限到達→ブロック+導線表示)。既存 `jp-plan-gates.spec.ts` を実経路テストへ拡張。

**ステップ10. 上限アラート通知(想定: 0.5日)**
- 内容: 80%到達(`getQuotaWarningCount`)でオーナー宛 ja アラートメールをジョブ化(既存 `alert-organisation-seat-drift` の流儀に従う)。`OrganisationQuotaBanner`(`_layout.tsx` で既に利用)との表示整合を確認。
- 対象: 新規 `packages/lib/jobs/definitions/internal/alert-organisation-quota.ts`、`packages/email/templates/`
- 検証: ユニット+E2E(アラート受信)。

**ステップ11. Stripe 3プラン設定+TSA 2段階プロバイダ(想定: 1.5日)**
- 内容: `packages/lib/server-only/stripe/` に FREE/STANDARD/BUSINESS の Price をマッピング(`plans.ts` の PlanId と紐付ける priceId 環境変数)。アップグレード/ダウングレード/解約フローと webhook ハンドラの整合確認。あわせてタイムスタンプをプラン別に切り替え(FREE=一般TSA、STANDARD以上=認定TSA)し、利用回数を Counter model で集計(改善案2)。
- 対象: `packages/lib/server-only/stripe/`、`.env.example`(priceId 追記)
- 検証: Stripe テストモードでのプラン変更 E2E(webhook 受信含む)。

**ステップ12. 領収書・請求書PDF(インボイス対応)(想定: 1.5日)**
- 内容: `packages/lib/server-only/htmltopdf/` で領収書PDF(登録番号欄・税率内訳)を生成する関数を新設。決済完了 webhook から発行。
- 対象: 新規 `packages/lib/server-only/stripe/receipt-pdf.ts`、htmltopdf テンプレート
- 検証: PDF生成 E2E(記載項目のアサーション)。

**ステップ13. 料金ページ・お試し導線(想定: 1.5日)**
- 内容: `_unauthenticated+` 配下に料金ページ(ja、3プラン比較)を新設。設定UIに現行プラン表示+アップグレード導線。無料プランの初回お試し送信オンボーディング(サインアップ直後にウィザードへ誘導)。
- 対象: `apps/remix/app/routes/_unauthenticated+/pricing.tsx`(新規)、設定UI、ダッシュボード
- 検証: 視覚回帰+E2E(サインアップ→お試し送信完了、プラン切替導線)。

### Stage D: フェーズ2 の残検証・アクセス制御完成(ステップ14〜16、約3.5日)

**ステップ14. 同時アクセス排他+監査ログWORM+データ保持期間(想定: 2日)**
- 内容: ①1署名トークンの同時アクセス制御(新セッション開始時に旧セッション無効化 or 排他)の実装有無を確認し、未実装なら `packages/lib/server-only/` に署名セッション管理を追加。②監査ログテーブル(DocumentAuditLog)への UPDATE/DELETE を PostgreSQL トリガーで拒否するマイグレーションを追加(WORM、改善案4)。③TeamGlobalSettings に「完了後 N 日で PDF 本体を論理削除(監査ログは保持)」するデータ保持期間設定と、`expire-recipients-sweep` を拡張した削除ジョブを実装(改善案3)。
- 対象: `packages/lib/server-only/`(recipient/document セッション)、`_recipient+/d.$token+`
- 検証: 2ブラウザコンテキストの同時アクセス E2E(後勝ち/排他どちらの仕様かを明記して担保)。

**ステップ15. 締結証明書の本人確認記載アサーション(想定: 1日)**
- 内容: `generate-certificate-pdf.ts` に本人確認方式(EMAIL_OTP/FIREBASE_EMAIL/eKYC)・検証日時が記載されることを PDF テキスト抽出で検証する E2E を `jp-otp-auth.spec.ts` に追加。
- 対象: `packages/app-tests/e2e/jp-otp-auth.spec.ts`
- 検証: アサーション追加で全ケースグリーン。

**ステップ16. ダウンロード証明オプション(想定: 1日)**
- 内容: 完了PDFダウンロードを記録し、締結証明書に「ダウンロード履歴」を付記するオプションを実装。
- 対象: ダウンロードルート、`generate-certificate-pdf.ts`
- 検証: E2E(ダウンロード→証明書に反映)。

### Stage E: 簡素化・検証・リリース(ステップ17〜22、約9日)

**ステップ17. 機能棚卸しと依存マップ(想定: 1.5日)**
- 内容: `packages/ee/`(実在確認済み: CSC 系)、`packages/api/`、Embedding 系、OrganisationGroup/TeamEmail の依存をマップ化し、削除/残置を決定する文書を作成。
- 対象: 全リポジトリ調査、`docs/plans/phase3-simplification-map.md`(新規)
- 検証: レビュー完了。

**ステップ18. 組織階層UIの削除(段階的)(想定: 2日)**
- 内容: フェーズ1で「詳細設定」へ退避済みの組織グループ・チーム階層・チームメールのメニューを削除し、メンバー管理(管理者/メンバー/閲覧)に置換。機能コードは flag/ビルド除外で残置(OSS 維持)。
- 対象: `apps/remix/app/routes/_authenticated+/o.$orgUrl.settings.*`、ナビゲーション
- 検証: 既存メンバー E2E 修正+全グリーン。削除対象参照チェック(grep ジョブ)。

**ステップ19. Embedding/EE/API v1 のビルド除外(想定: 2日)**
- 内容: SaaS 版ビルドから Embedding・EE・API v1 を除外(feature flag + エントリポイント分離)。第1段階として v1 は deprecated 通知+flag 無効化。
- 対象: `apps/remix/`、`packages/ee/`、`packages/api/`、turbo/ビルド設定、`server/router.ts`
- 検証: ビルド成功+不要参照ゼロ(tsc+lint+参照チェックジョブ)。`/api/v2` 存続 E2E。

**ステップ20. ジョブ・ストレージ・コンテナの標準化(想定: 2日)**
- 内容: ①ジョブプロバイダを local(DBキュー)固定化(Inngest/BullMQ はオプトイン隔離)。②S3互換ストレージ標準化——本番推奨を **Cloudflare R2**(S3互換・エグレス無料、従量費最小化/改善案1)とし、Object Lock+バージョニング設定ガイドを併記。database transport は開発/テスト限定。③`docker/Dockerfile` 見直し+Railway/Render ファイル整理。
- 対象: `packages/lib/jobs/client/`、`packages/lib/universal/upload/`、`docker/`、`railway.toml`、`render.yaml`
- 検証: 両トランスポータ E2E、Docker ビルド+ヘルスチェック通過、ジョブ失敗→リトライ E2E。

**ステップ21. 負荷テストと移行リハーサル(想定: 2.5日)**
- 内容: ①一括送信100件同時+署名同時アクセスの負荷テストスクリプト(p95: 一覧1秒以内・署名画面2秒以内)。②簡素化モデル移行のリハーサル(バックアップ→移行→検証→切替→ロールバック手順の文書化)。
- 対象: 負荷テストスクリプト新規、移行スクリプト+手順書新規、DB インデックス調整
- 検証: 目標レスポンス達成の記録、リハーサル環境での移行成功+データ整合チェック。

**ステップ22. E2E全体リグレッション・ドキュメント・リリース判定(想定: 2日)**
- 内容: ①フェーズ1〜3の全 spec フル実行。②運用ガイド・利用マニュアル(ja)・セルフホストガイド更新・料金説明の公開。③成功基準の最終検証とリリース判定(段階リリース計画の確定)。
- 対象: `packages/app-tests/`、`docs/`、利用マニュアル新規
- 検証: `npm run test:e2e` 全グリーン、ドキュメントのリンク切れゼロ、リリース承認記録。

---

## 3. リグレッション防止テスト計画(残タスク分)

| レイヤー | 対象 | ファイル | 実行タイミング |
| --- | --- | --- | --- |
| ユニット | 差し込み統合・CSV変数列・プランゲート | `packages/lib/**/*.test.ts` | 各PR |
| E2E | 変数UI→入力→差し込み→送信 | `jp-template-automation.spec.ts` 拡張 | 各PR |
| E2E | CSV一括(変数列+部分失敗) | `jp-bulk-send.spec.ts` 拡張 | 各PR |
| E2E | 承認フロー(UI経由)・署名順固定 | `jp-template-automation.spec.ts` 拡張 | 各PR |
| E2E | プラン上限ブロック+導線・アラート | `jp-plan-gates.spec.ts` 拡張 | 各PR |
| E2E | 同時アクセス排他・ダウンロード証明 | `jp-access-control.spec.ts` 拡張 | 各PR |
| E2E | 領収書PDF・料金ページ・お試し導線 | 新規 `jp-billing.spec.ts` | 各PR |
| 視覚回帰 | 承認UI・変数フォーム・料金ページ | `visual-regression/` | UI変更PR |
| 負荷 | バースト送信・同時署名 | 負荷テストスクリプト | リリース前 |
| 移行 | 簡素化モデル移行整合 | リハーサル手順 | リリース前 |

### 保護対象(壊してはいけないもの)
- フェーズ1・2の全 ja spec(`jp-core-signing-flow` / `jp-wizard-flow` / `jp-mobile-signing` / `jp-otp-auth` / `jp-access-control` / `jp-reminder-expiry` / `jp-dashboard`)。
- 既存テンプレート・ダイレクトリンク・seal-document・監査ログハッシュチェーン。
- 既存 CSV 形式(`recipient_N_*` 列)の後方互換(変数列は追加のみ)。

## 4. CI 組み込み
- PR: lint → tsc → Vitest → E2E(コア+テンプレート+プランゲート)→ 視覚回帰。
- main: E2E フル+負荷テスト(夜間)。
- 削除系 PR は grep ベースの参照チェックジョブを必須化。

## 5. リスクと対策

| リスク | 対策 |
| --- | --- |
| 差し込み変数の誤バインド | 未バインド検知の送信ブロック(ステップ3)+差し込み後 PDF の確認ステップ(オプション) |
| CSV 大量誤送信 | 送信前プレビュー+同時送信上限+送信後5分のキャンセル猶予 |
| 削除による OSS 影響 | 物理削除でなく flag/ビルド除外で残置 |
| 承認フローの配信保留漏れ | `approval-flow.ts` の pending 判定を送信ジョブ全経路から参照する設計を徹底 |
| ローカル Windows 環境のテスト制約(CRLF・Vitest 不具合) | 検証は「変更ファイルの `biome check`+`tsc --noEmit`」を最低ラインとし、E2E/Vitest は CI(Linux)実行を基準にする |

## 6. 完了定義(DoD)
1. テンプレート→変数入力→(承認)→送信→署名→完了が E2E で通過。
2. CSV一括(変数列対応)が正常/異常混在で動作し、行番号付き ja エラーレポートを出す。
3. プラン制限が送信実経路で機能し、上限到達時のアップグレード導線が動作。
4. 簡素化(flag 除外)後に既存全テストがグリーンで不要参照ゼロ。
5. 単一コンテナ+Postgres+S3 構成で負荷テスト基準を達成。
6. ドキュメント(運用ガイド/利用マニュアル/料金ページ)が公開状態で整備済み。
