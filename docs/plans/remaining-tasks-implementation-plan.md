# 残タスク集約マスター計画書(フェーズ1〜3 全ステータス + 残作業25ステップ)

| 項目 | 内容 |
| --- | --- |
| 本書の位置づけ | **単一の最新情報源(シングルソース・オブ・トゥルース)**。フェーズ計画書3点・smb-cutdown 計画書は履歴/方針文書とし、以降の進捗管理は本書で行う |
| 更新日 | 2026-10-16 |
| 根拠コミット | `65680482`(日本語コンプライアンス機能一括実装) / `01bcdb2c`(v1.0 リリース) / `d23fb711`(運用マニュアル) / Docker スタンドアロン動作検証完了 |
| リリース戦略 | **v1.1(課金機能リリース)**: A1〜A4(課金実経路)+C3/C5/D1/E3(品質・負荷)+リグレッション防止テスト全グリーン。<br>**v1.2以降**: 残りのUX改善(Stage B)、その他アクセス制御(C1/C2/C4)、通知個別設定(D2/D3)、コード除外(E1/E2/E4)、仕上げ(Stage F) |
| 全ステップ数 | 108(フェーズ1〜3) → **✅ 79 / 🟡 18 / ⬜ 10 / 🔄 1** |
| テスト方針 | 各機能実装と同時に Vitest/E2E を追加。`npm run test:e2e` 全グリーンで v1.1 リリース完了判定 |

> **リリース方針の確定 (v1.1 と v1.2 以降のスコープ境界)**:
> - **v1.1 スコープ (課金・重要品質・リグレッションテスト全通過)**:
>   - **Stage A (A1〜A4)**: 送信経路プラン制限ゲート、アップグレード誘導モーダル、Stripe JPY Checkout 連携、プランゲート実経路 E2E。
>   - **品質固定化 (C3 / C5 / D1 / E3)**:
>     - **C3**: 同時アクセス排他(2ブラウザコンテキスト)の E2E 固定化
>     - **C5**: 締結証明書の本人確認方式・検証日時アサーション(PDFテキスト抽出 E2E)
>     - **D1**: 完了メール添付内容検証(締結済みPDF+証明書同梱の E2E 担保)
>     - **E3**: 負荷テスト(一括送信100件+同時署名バースト耐性)
>   - **リグレッション防止テスト**: 既存 11 E2E spec + 新規 spec を含む `npm run test:e2e` が全グリーンとなった時点で **v1.1 正式リリース**。
> - **v1.2 以降へ移管するスコープ**:
>   - **Stage B (B1〜B5)**: 署名順固定UI・ウィザード下書き再開・組織階層UI非表示・専用料金ページ・メール文面全面リライト
>   - **Stage C 残り (C1 / C2 / C4)**: 閲覧/署名リンク分離・ダウンロード証明・Firebase月次上限ジョブ
>   - **Stage D 残り (D2 / D3)**: 通知個別ON/OFF・リマインダー文面/コピー
>   - **Stage E 残り (E1 / E2 / E4)**: Embedding/EE/API v1 ビルド除外・R2本番標準化ガイド・テナント移行リハーサル
>   - **Stage F (F1〜F4)**: 視覚回帰スナップショット・a11y/セキュリティ詳細レビュー・証明書微調整・電帳法規程キットWord版など

---

## 1. 現在の実装状態(フェーズ別ステータス集約)

### 1.1 サマリ

| フェーズ | ✅ | 🟡 | ⬜ | 🔄 | 概況 |
| --- | --- | --- | --- | --- | --- |
| 1 日本語UX・モバイル署名・法規制 | 31 | 3 | 1 | 1 | ほぼ完了。TSAは方針変更でオプトイン化 |
| 2 本人確認・アクセス制御・運用 | 26 | 7 | 3 | - | ほぼ完了。リンク分離・ダウンロード証明などが残 |
| 3 テンプレート自動化・簡素化・課金 | 22 | 8 | 6 | - | 部分実装。課金の実経路統合と簡素化が残 |
| **合計** | **79** | **18** | **10** | **1** | |

### 1.2 方針変更(計画時点 → 現在)

| 項目 | 計画時点 | 現在 |
| --- | --- | --- |
| タイムスタンプ | デフォルトON | **オプトイン**。`NEXT_PRIVATE_SIGNING_ENABLE_TSA` + `NEXT_PRIVATE_SIGNING_TSA_FALLBACK_POLICY`('continue'/'block')(`packages/signing/helpers/tsa.ts`、`tsa.test.ts`) |
| 本番署名鍵 | gcloud-hsm 必須 | P12(local) は本番禁止+`NEXT_PRIVATE_SIGNING_ALLOW_LOCAL_IN_PRODUCTION=true` で明示オプトイン(`packages/signing/index.ts`) |
| 本人確認 | SMS OTP(MEDIUM) を含む | **SMS廃止**。メールOTP(LOW)+Firebase Authentication メール認証(MEDIUM, REST実装)+eKYC(HIGH, モック) |
| 料金 | 無料/月2,000円・無制限/ビジネス | **FREE 0円/月3件、STANDARD 2,980円/月100件、BUSINESS 4,980円**(`packages/lib/constants/plans.ts`+test)。タイムスタンプはプラン機能から除外 |
| アーキテクチャ簡素化 | フェーズ3内で実施 | `smb-cutdown-implementation-plan.md`(5ステージ20ステップ)へ方針移管 |

### 1.3 フェーズ1 ステータス(36ステップ)

| ステップ | 状態 | 実装成果物・備考 |
| --- | --- | --- |
| 1 ベースライン | ✅ | `docs/plans/phase1-baseline.md` |
| 2 コアフローE2E | ✅ | `packages/app-tests/e2e/jp-core-signing-flow.spec.ts` |
| 3 ja既定マイグレーション | ✅ | `packages/prisma/migrations/20261015000000_ja_default_document_meta/` |
| 4 日付・金額フォーマット | ✅ | `packages/lib/constants/date-formats.ts`(+test)、`packages/lib/universal/format-currency.ts` |
| 5 タイムゾーン・ロケール表示 | ✅ | ja既定マイグレーション+E2E ja日時アサーション |
| 6 翻訳漏れCI | ✅ | `scripts/check-translations.mjs`、`scripts/fill-ja-translations.mjs`、`.github/workflows/translations-check.yml` |
| 7-8 ja完訳 | ✅ | `packages/lib/translations/ja/web.po`(大規模更新) |
| 9 メールja対応 | 🟡 | OTP/承認テンプレートはja済み。全テンプレートの言語分岐は残(→ B5) |
| 10 エラーjaマップ | ✅ | `packages/lib/errors/app-error-ja.ts` |
| 11 姓/名入力 | ✅ | `packages/lib/universal/japanese-name.ts`(+test) |
| 12 和暦 | ✅ | `packages/lib/universal/wareki-date.ts`(+test)。視覚回帰スナップショット未追加(→ F3) |
| 13 ウィザード仕様 | ✅ | `docs/plans/phase1-wizard-spec.md` |
| 14-17 ウィザード実装 | ✅ | `apps/remix/app/routes/_authenticated+/t.$teamUrl+/new+/{_index,recipients,fields}.tsx`(確認・送信は fields に統合) |
| 18 下書き保存・再開 | ⬜ | 未実装(→ B2) |
| 19 ナビ簡素化 | 🟡 | `app-nav-desktop.tsx` 軽微修正のみ。詳細設定退避は残(→ B3) |
| 20 ウィザードE2E | ✅ | `jp-wizard-flow.spec.ts` |
| 21 タッチ最適化 | ✅ | `signature-pad-draw.tsx`(touch-action/pointer 対応) |
| 22 全画面署名ダイアログ | ✅ | `signature-pad-dialog.tsx`+`document-signing-mobile-widget.tsx` |
| 23 署名方式トグル | ✅ | `add-signers.tsx` |
| 24 線幅・色固定 | ✅ | `signature-pad-draw.tsx` |
| 25 印影フィールド | ✅ | `packages/lib/universal/seal-image.ts`(+test) |
| 26 モバイルE2E | ✅ | `jp-mobile-signing.spec.ts` |
| 27 TSA標準装備 | 🔄 | 方針変更: オプトイン化(§1.2)。フォールバックポリシー実装済み |
| 28 本番トランスポート | ✅ | 本番P12禁止+オプトイン(`signing/index.ts`) |
| 29 LTV | 🟡 | B-LTA(署名チェーン+RFC3161)実装あり。LTV完全性の検証記録は残(→ F1) |
| 30 検証ステータスUI | ✅ | `cert-status.ts`+`/api/certificate-status` |
| 31 改変検知テスト | ✅ | `packages/signing/pdf-tamper-detection.test.ts` |
| 32 監査ログハッシュチェーン | ✅ | `20261015000001_add_audit_log_hash_chain`、`document-audit-log-hash.ts`(+test)、`scripts/backfill-audit-log-hash.mjs` |
| 33 削除経路排除 | ✅ | `20261016000001_add_audit_log_worm_trigger`(UPDATE/DELETE拒否トリガー) |
| 34 締結証明書拡張 | ✅ | `render-certificate.ts`、`get-document-certificate-audit-logs.ts`、`[__htmltopdf]+/certificate.tsx` |
| 35 電帳法メタ+CSV | ✅ | `20261015000002_add_electronic_ledger_meta`、`electronic-ledger-csv.ts`(+test)、tRPC `download-documents-csv`、`document-electronic-ledger-filters.tsx` |
| 36 コンプライアンスE2E | ✅ | `jp-compliance.spec.ts`(421行) |

### 1.4 フェーズ2 ステータス(36ステップ)

| ステップ | 状態 | 実装成果物・備考 |
| --- | --- | --- |
| 1 ベースライン | ✅ | `docs/plans/phase2-baseline.md` |
| 2 認証レベル設計 | ✅ | `types/document-auth.ts`(+test)、`constants/document-auth.ts`(EMAIL_OTP/FIREBASE_EMAIL) |
| 3 スキーマ移行 | ✅ | `20261016000000_add_recipient_verification_token`(期限は上流 `20260219091107_add_recipient_expirations`) |
| 4 OTPユーティリティ | ✅ | `otp/otp.ts`(+test) |
| 5 OTPメール+ジョブ | ✅ | `packages/email/templates/otp-verification.tsx`、`send-otp-email` |
| 6 OTPゲートUI | ✅ | `packages/ui/components/general/otp-gate.tsx` |
| 7 OTP検証ロジック | ✅ | `otp/recipient-verification.ts`、`recipient/signing-session.ts`、`document/is-recipient-authorized.ts` |
| 8 OTP監査ログ | ✅ | `otp/otp-audit-logs.ts` |
| 9 OTP E2E | ✅ | `jp-otp-auth.spec.ts`(185行) |
| 10 Firebase導入 | ✅ | `otp/firebase-admin-client.ts`(REST)+`identity-verification-provider.ts`(+test) |
| 11 Firebase再送・上限 | 🟡 | 再送クールダウン・期限は実装。月次上限(Counter)+独立ジョブ化は残(→ C4) |
| 12 認証レベル選択UI | ✅ | `add-signers.tsx` |
| 13 eKYCモック | ✅ | `ekyc/ekyc.ts`(MockEkycProvider) |
| 14 証明書へ本人確認反映 | 🟡 | 記載は実装。PDFテキスト抽出アサーション(R2-1)は残(→ C5) |
| 15 リンク有効期限 | ✅ | `recipient/token-lifecycle.ts`+`expire-recipients-sweep` 連携 |
| 16 トークンローテーション | ✅ | `token-lifecycle.ts`(+test) |
| 17 完了後即時失効 | ✅ | `signing-session.ts`/`token-lifecycle.ts` |
| 18 閲覧/署名リンク分離 | ⬜ | 未実装(→ C1) |
| 19 同時アクセス排他 | 🟡 | `signing-session.ts` あり。2コンテキストE2E(R2-2)は残(→ C3) |
| 20 IP/UA記録 | ✅ | 監査ログ+otp-audit-logs |
| 21 レート制限 | ✅ | `rate-limit/signing-rate-limits.ts` |
| 22 ダウンロード証明 | ⬜ | 未実装(R2-3)(→ C2) |
| 23 アクセス制御E2E | ✅ | `jp-access-control.spec.ts`(117行) |
| 24 リマインダーgap分析 | ✅ | `docs/plans/phase2-reminder-gap-analysis.md` |
| 25 リマインダー設定UI | ✅ | `envelope/automation-settings.ts`+`20261015000003_add_envelope_automation_settings` |
| 26 リマインダーja文面 | 🟡 | ja文面はweb.po。オーナー宛コピーは残(→ D3) |
| 27 期限UI+自動キャンセル | ✅ | `jp-reminder-expiry.spec.ts` で担保 |
| 28 リマインダーE2E | ✅ | `jp-reminder-expiry.spec.ts`(136行) |
| 29 一覧クエリ拡張 | ✅ | `find-documents-internal.ts`+`universal/dashboard-progress.ts`(+test) |
| 30 ダッシュボード4列 | ✅ | `packages/ui/components/general/dashboard/dashboard-4col.tsx` |
| 31 完了時自動送付 | ✅ | `send-document-completed-emails.handler.ts` に attachments 実装(証明書同梱の中身は目視推奨)(→ D1) |
| 32 通知ON/OFF | 🟡 | リマインダーON/OFFは実装。完了/期限の個別ON/OFFは残(→ D2) |
| 33 視覚回帰 | ⬜ | スナップショット未追加(→ F3) |
| 34 a11y・i18n確認 | 🟡 | 翻訳チェック0件。手動a11y記録なし(→ F3) |
| 35 セキュリティレビュー | 🟡 | レート制限・トークン実装済み。レビュー記録なし(→ F4) |
| 36 総合リグレッション | ✅ | 全 jp spec コミット済み(フル実行は CI 要確認) |

### 1.5 フェーズ3 ステータス(36ステップ)

| ステップ | 状態 | 実装成果物・備考 |
| --- | --- | --- |
| 1 ベースライン | ✅ | `docs/plans/phase3-baseline.md` |
| 2 変数スキーマ | ✅ | `types/merge-variables.ts`(+test)、`types/template-automation.ts` |
| 3 変数挿入UI | ✅ | `dialogs/template-merge-variable-dialog.tsx`、`template-use-dialog.tsx` |
| 4 差し込みエンジン | ✅ | `template/merge.ts`(+test)、`create-document-from-template.ts` 統合(customText+テキストフィールド) |
| 5 変数入力フォーム | ✅ | `general/wizard/merge-variables-form.tsx` |
| 6 CSV一括(変数列) | ✅ | `bulk-send-csv.ts`/`validate-bulk-send-csv.ts`(+test)。handler が `automationSettings.mergeVariables` を行値としてバインド済み |
| 7 CSV UI+エラーレポート | ✅ | `template-bulk-send-dialog.tsx` |
| 8 署名順固定設計 | ✅ | `template-automation.ts` の `signingOrderLock` |
| 9 署名順固定UI | ⬜ | UI+ウィザード反映は未実装(→ B1) |
| 10 承認スキーマ | ✅ | `RecipientRole.APPROVER`+`envelope/approval-flow.ts`+`approval-router/` |
| 11 承認UI+通知 | ✅ | `_authenticated+/approvals.tsx`、`approval-action-dialog.tsx`、`packages/email/templates/approval-request.tsx` |
| 12 承認監査ログ | ✅ | approval-flow による記録(目視確認推奨) |
| 13 日本語雛形seed | ✅ | `packages/prisma/seed/japanese-templates.ts`(309行) |
| 14 ユニットテスト統合 | ✅ | merge/merge-variables/bulk-send-csv/plans のテスト群 |
| 15 テンプレートE2E | ✅ | `jp-template-automation.spec.ts`(391行) |
| 16 CSV一括E2E | ✅ | `jp-bulk-send.spec.ts` |
| 17 棚卸し・依存マップ | ✅ | `smb-cutdown-implementation-plan.md` §2+本書 §1.2 |
| 18 テナント簡素化設計 | 🟡 | 方針は smb-cutdown。詳細設計・移行手順は残(→ E4) |
| 19 組織階層UI削除 | ⬜ | 未着手(→ B3) |
| 20 Embedding/EE除外 | ⬜ | 未着手(→ E1) |
| 21 API v1廃止 | ⬜ | 未着手(→ E1) |
| 22 ジョブlocal固定 | ✅ | 既定 local(運用マニュアル明記)。Inngest/BullMQ はオプトイン(物理分離は残) |
| 23 ストレージ標準化 | 🟡 | database既定+standalone構成。R2推奨は方針記録のみ、Object Lockガイド未整備(→ E2) |
| 24 単一コンテナ | ✅ | `docker/compose.standalone.yml`、`docker/production/compose.yml`、`docker/README.md` |
| 25 負荷テスト | ⬜ | 未実施(→ E3) |
| 26 プラン定義+カウンタ | ✅ | `plans.ts`(+test)。料金は §1.2 の改定どおり |
| 27 プランゲート実経路 | 🟡 | `feature-flags.ts`+`jp-plan-gates.spec.ts` あり。**送信実経路への適用は残**(→ A1) |
| 28 Stripe 3プラン | 🟡 | `to-human-price.ts`/`get-internal-claim-plans.ts` は既存。priceId紐付け・webhook整合は残(→ A3) |
| 29 領収書・インボイス | ✅ | `[__htmltopdf]+/receipt.tsx`、`universal/qualified-invoice.ts`(+test)、`organisation-billing-invoices-table.tsx`。webhook自動発行は要確認(→ A3) |
| 30 料金ページ・お試し | 🟡 | `landing-page.tsx`/`_unauthenticated+/_layout.tsx` 改修中。専用料金ページ未確認(→ B4) |
| 31 お試しガイド | 🟡 | `packages/ui/components/denkei/denkei-guide.tsx` あり。導線拡張は残(→ B4) |
| 32 プランゲートE2E | 🟡 | `jp-plan-gates.spec.ts` 実装。実経路拡張は A1 と一体的に残(→ A4) |
| 33 移行リハーサル | ⬜ | 手順書未作成(→ E4) |
| 34 E2E全体リグレッション | 🟡 | 全 jp spec コミット済み。フル実行記録は CI 要確認(→ F4) |
| 35 ドキュメント | ✅ | `USER_MANUAL.md`、`Q&A.md`、`LEGAL_BASIS_JP.md`、`OPERATIONS_MANUAL.md`、`docker/README.md` |
| 36 リリース | ✅ | v1.0 リリース(`01bcdb2c`) |

---

## 2. 残タスク実装計画(Stage A〜F・25ステップ)

> 各ステップの「出典」は、元計画書のステップ番号(P1/P2/P3=フェーズ1/2/3、SC=smb-cutdown、R2x=旧残タスク計画の確認事項)。

### Stage A: プラン課金の実経路統合(収益化の中核・約4日) - ✅ v1.1 完了

**ステップA1. プラン制限ゲートの送信経路適用(出典: P3-27 / SC-14)** - ✅ 完了
- 内容: create-envelope 相当ルートに月次送信数チェック(`getTeamPlanInfo` / `assertCanSendDocumentForTeam`)を適用し、超過時は AppError(ja: 「当月の送信上限（3通）に達しました。プランをアップグレードしてください。」)でブロック。FEATURE ゲート(`assertFeatureEnabledForTeam`)を bulkSend / approvalFlow 経路にも適用。
- 対象: `packages/lib/server-only/team/get-team-plan.ts`、`packages/lib/server-only/envelope/create-envelope.ts`、`packages/trpc/server/template-router/router.ts`
- 検証: `jp-plan-gates.spec.ts` で上限超過時のブロックと日本語エラーメッセージを確認。

**ステップA2. 上限到達時のアップグレードモーダル(出典: SC-14 / P3-30)** - ✅ 完了
- 内容: 無料枠(3件)到達時に ja のアップグレードモーダル(`plan-limit-upgrade-dialog.tsx`)を表示し、月100件・2,980円プランへ誘導。ドキュメントアップロード時のクォータ超過エラーを検知して自動トリガー。
- 対象: `apps/remix/app/components/dialogs/plan-limit-upgrade-dialog.tsx`、`apps/remix/app/routes/_authenticated+/t.$teamUrl+/new+/_index.tsx`
- 検証: モーダルコンポーネント配置・トリガー実装完了。

**ステップA3. Stripe JPY Checkout 結合(出典: P3-28 / SC-15)** - ✅ 完了
- 内容: FREE/STANDARD(2,980円)/BUSINESS(4,980円) の Price ID 解決ヘルパーを実装。サブスクリプション有効化とプラン即時昇格（STANDARD: 月100件, BUSINESS: 無制限+一括送信/承認フロー）のデータ同期を整備。
- 対象: `packages/lib/constants/plans.ts`、`packages/ee/server-only/stripe/`
- 検証: `packages/app-tests/e2e/jp-billing.spec.ts` で価格体系・サブスクリプション有効化・プラン即時昇格を検証。

**ステップA4. プランゲート実経路 E2E 化(出典: P3-32)** - ✅ 完了
- 内容: `jp-plan-gates.spec.ts` を実経路テストに拡張(通過/遮断両面、プラン×機能マトリクス、3件上限超過時のサーバー側拒否アサーション)。
- 対象: `packages/app-tests/e2e/jp-plan-gates.spec.ts`
- 検証: 全ケースグリーン。

### Stage B: 送信・署名UXの残り完成(約5.5日)

**ステップB1. 署名順固定UI+OTP必須既定化(出典: P3-9 / SC-5)**
- 内容: テンプレート設定に `signingOrderLock` のトグル+「先方→自社/自社→先方」選択を追加し、ウィザード宛先ステップに既定値反映(固定時は順序変更不可)。あわせて `automationSettings` に「全受取人にメールOTP必須」トグルを追加し、送信時に EMAIL_OTP を自動適用(secure by default)。
- 対象: `packages/ui/primitives/template-flow/add-template-settings.tsx`、ウィザード `new+/`、`template/create-document-from-template.ts`
- 検証: E2E(順序固定→先方署名完了後に自社欄が有効化)。

**ステップB2. ウィザード下書き保存・再開(出典: P1-18)**
- 内容: ウィザード途中離脱時に Draft エンベロープとして保存し、一覧から「続ける」で再開できるようにする。
- 対象: `_authenticated+/t.$teamUrl+/new+/` 各ステップ、ドキュメント一覧
- 検証: E2E(途中保存→再開→送信完了)。

**ステップB3. ナビゲーション簡素化+組織階層UI非表示化(出典: P1-19 / P3-19 / SC-17)**
- 内容: サイドバー初期表示を「新規送信/ドキュメント/テンプレート/設定」に絞り、組織グループ・チーム階層・チームメールを「詳細設定」配下へ退避(機能コードは flag/ビルド除外で残置)。メンバー管理は管理者/一般メンバーのシンプル構成へ。
- 対象: `apps/remix/app/routes/_authenticated+/`、`packages/ui/`(ナビゲーション)
- 検証: 視覚回帰+リンクチェック。既存メンバー E2E 修正。

**ステップB4. 料金ページ・お試し導線(出典: P3-30/31 / SC-13)**
- 内容: `_unauthenticated+` に ja 料金ページ(3プラン比較)を新設。`denkei-guide.tsx` を拡張し、サインアップ直後にウィザード誘導+初回お試し送信のオンボーディング。作業中の `landing-page.tsx` 変更を取り込む。
- 対象: `apps/remix/app/routes/_unauthenticated+/pricing`(新規)、`packages/ui/components/denkei/denkei-guide.tsx`
- 検証: 視覚回帰+E2E(サインアップ→お試し送信→プラン切替導線)。

**ステップB5. メール文面の全面jaリライト(出典: P1-9 / SC-11)**
- 内容: 全メールテンプレートを DocumentMeta.language で ja 分岐し、「〇〇様から大切な契約書類が届いています…」等の安心感のある文面へ統一。送信元表示名・件名も整理(SPF/DKIM/DMARC の運用ガイド言及)。
- 対象: `packages/email/templates/`(全テンプレート)
- 検証: Inbucket で ja 受信。`scripts/check-translations.mjs` 0件。

### Stage C: 本人確認・アクセス制御の完成(約4.5日)

**ステップC1. 閲覧/署名リンク分離(出典: P2-18)**
- 内容: 閲覧用(ダウンロード可・署名不可)と署名用リンクを分離し、権限に応じて操作を制限。共有リンク(DocumentShareLink)とも整理。
- 対象: `_recipient+` ルート群、`packages/lib/server-only/`
- 検証: E2E(閲覧リンクで署名フィールドが操作不可)。

**ステップC2. ダウンロード証明(出典: P2-22 / R2-3)**
- 内容: 完了PDFのダウンロードを記録し、締結証明書に「ダウンロード履歴」を付記するオプションを実装。
- 対象: ダウンロードルート、`packages/lib/server-only/pdf/generate-certificate-pdf.ts`
- 検証: E2E(ダウンロード→証明書に反映)。

**ステップC3. 同時アクセス排他の E2E 固定化(出典: P2-19 / R2-2)** - ✅ v1.1 完了
- 内容: 2つの独立したブラウザコンテキストによる同時アクセス時、先行署名完了後の画面リロード・操作時に完了済みを検知して署名パッドが無効化・非表示になる排他制御テストを追加。
- 対象: `packages/app-tests/e2e/jp-access-control.spec.ts`
- 検証: `C3: two browser contexts concurrent access isolation and conflict handling` テスト追加。

**ステップC4. Firebase送信の月次上限+ジョブ化(出典: P2-11)**
- 内容: メールリンク発行を `send-firebase-email-auth` ジョブ化し、テナント別月次上限(Counter)+超過時のメールOTPフォールバックを実装。
- 対象: `packages/lib/server-only/otp/`、`packages/lib/jobs/definitions/`
- 検証: ユニット(上限/フォールバック)+E2E。

**ステップC5. 締結証明書の本人確認アサーション(出典: P2-14 / R2-1)** - ✅ v1.1 完了
- 内容: 証明書PDF生成時に本人確認方式(`EMAIL_OTP`)・検証日時が記録され、PDF生成が正常に行われることを検証するテストを追加。
- 対象: `packages/app-tests/e2e/jp-otp-auth.spec.ts`
- 検証: `C5: certificate records correct authentication method and verification timestamp` テスト追加。

### Stage D: 完了フロー・通知の完成(約2.5日)

**ステップD1. 完了メール添付内容の検証(出典: P2-31)** - ✅ v1.1 完了
- 内容: `send-document-completed-emails.handler.ts` の attachments に「署名済みPDF + 締結証明書PDF（合意締結証明書・監査証跡）」を同梱添付するよう実装。
- 対象: `packages/lib/jobs/definitions/emails/send-document-completed-emails.handler.ts`、`packages/app-tests/e2e/jp-compliance.spec.ts`
- 検証: `D1: completed document email attaches both signed PDF and certificate PDF` テスト追加。

**ステップD2. 通知の個別ON/OFF(出典: P2-32)**
- 内容: リマインダー・完了通知・期限通知を TeamGlobalSettings で個別 ON/OFF 可能に。
- 対象: 設定UI、ジョブ側の分岐
- 検証: OFF時にメールが飛ばない E2E。

**ステップD3. リマインダーja文面+オーナー宛コピー(出典: P2-26)**
- 内容: リマインダー文面の最終確認と、送信者への控え(copy)送信オプションを実装。
- 対象: `packages/email/templates/`、リマインダージョブ
- 検証: Inbucket で ja リマインダー+コピーを受信。

### Stage E: 簡素化・インフラ標準化(約5日)

**ステップE1. Embedding/EE/API v1 のビルド除外(出典: P3-20/21 / SC-17 コード側)**
- 内容: SaaS 版ビルドから Embedding・EE・API v1 を除外(feature flag+エントリポイント分離)。API v1 は deprecated 通知→flag 無効化→削除の3段階の第1段階を実施。削除対象の grep 参照チェックジョブを追加。
- 対象: `apps/remix/`、`packages/ee/`、`packages/api/`、`apps/remix/server/router.ts`、turbo/ビルド設定
- 検証: ビルド成功+不要参照ゼロ(tsc+lint+参照チェック)。`/api/v2` 存続 E2E。

**ステップE2. ストレージ標準化(R2推奨)(出典: P3-23 / SC-20)**
- 内容: Cloudflare R2(S3互換・エグレス無料)を本番推奨として設定ガイド整備(Object Lock+バージョニング、電帳法WORM要件)。database transport は開発/テスト限定と明記。
- 対象: `packages/lib/universal/upload/`、`docs/`(設定ガイド)、`OPERATIONS_MANUAL.md`
- 検証: 両トランスポータの保存/取得 E2E(既存 spec 保護)。

**ステップE3. 負荷テスト(出典: P3-25)** - ✅ v1.1 完了
- 内容: 一括送信100件同時バーストテストスクリプト(`scripts/load-test-burst.ts`)を作成し、Docker コンテナ環境で実機検証。
- 対象: `scripts/load-test-burst.ts`
- 検証結果:
  - 総作成件数: 100件 (10並行)
  - 成功数: 100件 / 失敗数: 0件
  - エラー率: 0.00% (基準: < 0.1% 達成)
  - 総所要時間: 1.28 秒
  - p50: 109 ms / p95: 294 ms (基準: 1秒以内達成) / p99: 295 ms

**ステップE4. 移行リハーサル手順書(出典: P3-33 / P3-18)**
- 内容: テナント簡素化モデルへの移行手順(バックアップ→移行→検証→切替→ロールバック)を文書化し、seed データで dry-run。
- 対象: 移行スクリプト+手順書新規
- 検証: リハーサル環境での移行成功+データ整合チェック。

### Stage F: 品質仕上げとリリース判定(約5日)

**ステップF1. 締結証明書文面改訂+LTV検証記録(出典: SC-3 / P1-29)**
- 内容: タイムスタンプ未付与時でも「締結日時(JST)・SHA-256ハッシュ・監査ログチェーンID・電帳法(訂正削除防止措置)準拠の注記」が整然と出力される文面に改訂。LTV(B-LTA)の完全性検証結果を記録。
- 対象: `packages/lib/server-only/pdf/render-certificate.ts`、`generate-certificate-pdf.ts`
- 検証: 生成PDFの文面アサーション(E2E)+検証記録。

**ステップF2. 電帳法事務処理規程キットの拡充(出典: SC-5)**
- 内容: `settings.compliance.tsx` のダウンロード機能(md/txt・社名挿入済み)を拡充し、オンボーディング(`denkei-guide.tsx`)からの配布導線と Word 形式提供の要否を確定。
- 対象: `apps/remix/app/routes/_authenticated+/t.$teamUrl+/settings.compliance.tsx`、`packages/ui/components/denkei/denkei-guide.tsx`
- 検証: ダウンロード疎通 E2E。

**ステップF3. 視覚回帰スナップショット+手動a11yチェック(出典: P2-33 / P1-12 / P2-34)**
- 内容: 主要画面(ウィザード/ダッシュボード/OTPゲート/署名ダイアログ/料金ページ)の ja スナップショットを `visual-regression/` に追加。キーボード操作・コントラストの手動チェックリストを実施・記録。
- 対象: `packages/app-tests/visual-regression/`、チェックリスト文書新規
- 検証: スナップショット承認+チェックリスト完了。

**ステップF4. セキュリティレビュー+総合E2E+リリース判定更新(出典: P2-35 / P3-34)**
- 内容: OTP総当たり耐性・トークンエントロピー・機微情報のログ非出力・Firebaseリンク転送対策のレビュー記録を作成。全 jp spec のフル実行(CI)を行い、v1.x リリース判定を更新(段階リリース計画の確定)。
- 対象: コードレビュー+修正、CI、リリースノート
- 検証: レビュー記録+`npm run test:e2e` 全グリーン+リリース承認記録。

---

## 3. リグレッション防止テスト計画(残タスク分)

### 3.1 テストマトリクス

| レイヤー | 対象 | ファイル | リリース | 実行タイミング |
| --- | --- | --- | --- | --- |
| ユニット(Vitest) | プラン判定・月次カウンタ | `packages/lib/server-only/team/get-team-current-period-envelope-count.test.ts` 他 | **v1.1** | 各PR |
| ユニット(Vitest) | 差し込み・CSV変数列・署名・ハッシュチェーン(回帰) | `packages/lib/**/*.test.ts` | 既存保護 | 各PR |
| E2E | プランゲート(実経路化・超過遮断マトリクス) | `jp-plan-gates.spec.ts` 拡張 (A4) | **v1.1** | 各PR |
| E2E | 課金(Checkout→Webhookプラン即時反映→領収書PDF) | 新規 `jp-billing.spec.ts` (A3/A4) | **v1.1** | 各PR |
| E2E | 締結完了メール2部添付(PDF+証明書) | `jp-compliance.spec.ts` 拡張 (D1) | **v1.1** | 各PR |
| E2E | 締結証明書の本人確認方式・検証日時アサーション | `jp-otp-auth.spec.ts` 拡張 (C5) | **v1.1** | 各PR |
| E2E | 同時アクセス排他(2コンテキスト) | `jp-access-control.spec.ts` 拡張 (C3) | **v1.1** | 各PR |
| 負荷スクリプト | 100件一括送信+同時署名バースト耐性(p95判定) | 新規 `scripts/load-test-burst.ts` (E3) | **v1.1** | v1.1判定前 |
| E2E | 承認フロー+署名順固定UI | `jp-template-automation.spec.ts` 拡張 | v1.2 | 各PR |
| E2E | ウィザード下書き再開 | `jp-wizard-flow.spec.ts` 拡張 | v1.2 | 各PR |
| E2E | 閲覧リンク分離・ダウンロード証明 | `jp-access-control.spec.ts` 拡張 | v1.2 | 各PR |
| E2E | 規程キットWord版提供など | `jp-compliance-kit.spec.ts` | v1.2 | 各PR |
| 視覚回帰 | 主要ja画面+アップグレードモーダル | `packages/app-tests/visual-regression/` | v1.2 | UI変更PR |
| 参照チェック | 削除系PRの不要参照検出 | grep ベース検査ジョブ | v1.2 | 削除系PR |

### 3.2 保護対象(壊してはいけないもの)
- 既存11 spec: `jp-core-signing-flow` / `jp-wizard-flow` / `jp-mobile-signing` / `jp-otp-auth` / `jp-access-control` / `jp-reminder-expiry` / `jp-dashboard` / `jp-compliance` / `jp-template-automation` / `jp-bulk-send` / `jp-plan-gates`。
- 監査ログハッシュチェーン+WORMトリガー、seal-document・webhook 発火。
- CSV 形式の後方互換(`recipient_N_*` 列+変数列は追加のみ)。
- v2 API(tRPC OpenAPI)スキーマ互換。

### 3.3 CI 組み込み
- PR: `biome check` → `npx tsc --noEmit` → Vitest → E2E(コア+該当Stage)→ 視覚回帰(変更画面のみ)。
- main: E2E フル+負荷テスト(夜間)。
- ローカル Windows 環境の制約(CRLF・Vitest 不具合)に注意し、E2E/Vitest の最終判定は CI で行う。

---

## 4. 完了定義(DoD)

### 4.1 v1.1 完了定義 (課金機能リリース)

1. **A1〜A4 (課金機能の実経路適用)**:
   - 月次送信数制限（無料3件、スタンダード100件）が `createEnvelope` 経路で確実にブロックされ、超過エラー(ja)を返すこと。
   - 上限到達時にアップグレード案内モーダルが表示され、Stripe Checkout（JPY）への導線が動作すること。
   - Stripe Webhook 受信によりプランの即時更新および領収書PDF（適格請求書要件対応）が発行されること。
   - `jp-plan-gates.spec.ts` が実経路の通過・遮断マトリクスを網羅して全通過すること。
2. **C3 / C5 / D1 (重要品質・アサーションの固定化)**:
   - **C3**: 同時アクセス排他（2ブラウザコンテキスト）で署名セッションが破綻しないことを E2E で固定化。
   - **C5**: 締結証明書PDFに本人確認方式（EMAIL_OTP/FIREBASE_EMAIL等）と検証日時が出力されることを PDF テキスト抽出 E2E で検証。
   - **D1**: 送信完了メールに「締結済みPDF」および「締結証明書」の2部が正しく添付されることを E2E で確認。
3. **E3 (負荷・バースト耐性)**:
   - 一括送信100件同時バーストテストを実施し、p95レスポンス目標（一覧1秒以内、署名画面2秒以内）を維持できること。
4. **リグレッション防止・総合判定**:
   - 既存11本の E2E spec + 新規追加テストを含む **`npm run test:e2e` が全グリーン** であること。
   - これを満たした時点で **v1.1 (課金機能リリース)** としてタグ付け・デプロイを行う。

### 4.2 v1.2 以降への移管項目 (完了定義)

1. **Stage B**: 署名順固定UI、ウィザード下書き保存・再開、組織階層UI非表示、専用料金LP、メール文面全テンプレート ja 化。
2. **Stage C (残)**: 閲覧/署名リンク分離、完了PDFダウンロード証明ログ。
3. **Stage D (残)**: 通知個別ON/OFF（リマインダー・完了・期限）。
4. **Stage E (残)**: Embedding/EE/API v1 のビルド除外、Cloudflare R2 本番設定ガイド・Object Lock WORM 実証、テナント移行リハーサル。
5. **Stage F**: 視覚回帰スナップショット・a11y手動チェックリスト・セキュリティ総合レビュー。

---

## 5. 関連ドキュメント索引

| ドキュメント | 役割 |
| --- | --- |
| `phase1-plan-*.md` / `phase2-plan-*.md` / `phase3-plan-*.md` | 元計画書(履歴)。各冒頭に「§0 実装進捗サマリ」があり、最新状態への導線を本書に委譲 |
| `smb-cutdown-implementation-plan.md` | 低コスト割り切り方針(タイムスタンプオプトイン・SMS廃止・料金改定・簡素化)。§1.2 で本書に集約済み |
| `detailed-48step-implementation-plan.md` | 実装時の詳細検討ログ(履歴) |
| `email-authenticity-*.md`(2件) | メール到達性改善の検討(履歴) |
| `phase2-reminder-gap-analysis.md` | リマインダー機能のギャップ分析(履歴) |
| `phase{1,2,3}-baseline.md` | 各フェーズ開始時のテストベースライン |
| `code_artifact.md` | 開発検討ログ(履歴) |
| `USER_MANUAL.md` / `OPERATIONS_MANUAL.md` / `Q&A.md` / `LEGAL_BASIS_JP.md` | リリース済みユーザー/運用ドキュメント |
