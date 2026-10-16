# フェーズ2 実装計画書: 本人確認・署名リンク保護・自動フォロー運用

| 項目 | 内容 |
| --- | --- |
| 対象提案 | 案5(本人確認の段階的標準化: メールOTP/Firebase Authenticationメール認証/eKYC)/ 案6(署名リンクのアクセス制御強化)/ 案7(自動リマインダー・期限管理・進捗ダッシュボード) |
| 期間目安 | 5〜7週間(2〜3名想定) |
| ステップ数 | 36ステップ(Stage A〜F) |
| 前提 | フェーズ1完了(ja UI・ウィザード・タイムスタンプ・監査ログハッシュチェーンが導入済み) |
| テスト方針 | 各Stageでリグレッション防止テストを併せて作成(第4章参照)。セキュリティ系はユニット+E2Eの二重化 |
| 実装状態 | **ほぼ完了、一部残あり**(2026-10-16 時点。最新状態は直下の「§0 実装進捗サマリ」を優先) |

---

## 0. 実装進捗サマリ(2026-10-16 現在)

> 本節が最新の実装状態です。§1 以降の本文は計画時点の記述を保持します。
> 対応コミット: `65680482`(日本語コンプライアンス機能一括実装) / `01bcdb2c`(v1.0 ドキュメント) / `d23fb711`(運用マニュアル)。
> 残タスクは `docs/plans/remaining-tasks-implementation-plan.md`(R2-1〜R2-3、ステップ14〜16相当)を参照。
> 凡例: ✅ 実装済み / 🟡 一部実装(残あり) / ⬜ 未着手

### 実装メモ(計画時点からの差分)
- Firebase は **SDK 依存を追加せず REST 経由**で実装(`packages/lib/server-only/otp/firebase-admin-client.ts` + `identity-verification-provider.ts`)。
- 同時アクセス排他は `recipient/signing-session.ts` で実装済みだが、2ブラウザコンテキスト E2E が残(remaining-tasks R2-2)。

### ステップ別状態

| ステップ | 状態 | 実装成果物・備考 |
| --- | --- | --- |
| 1 | ✅ | `docs/plans/phase2-baseline.md` |
| 2 | ✅ | `packages/lib/types/document-auth.ts`(+test)、`packages/lib/constants/document-auth.ts`(EMAIL_OTP/FIREBASE_EMAIL) |
| 3 | ✅ | `20261016000000_add_recipient_verification_token`(受取人有効期限は上流 `20260219091107_add_recipient_expirations` を活用) |
| 4 | ✅ | `packages/lib/server-only/otp/otp.ts`(+test) |
| 5 | ✅ | `packages/email/templates/otp-verification.tsx`、`send-otp-email` ジョブ |
| 6 | ✅ | `packages/ui/components/general/otp-gate.tsx` |
| 7 | ✅ | `otp/recipient-verification.ts`、`recipient/signing-session.ts`、`document/is-recipient-authorized.ts` |
| 8 | ✅ | `packages/lib/server-only/otp/otp-audit-logs.ts` |
| 9 | ✅ | `jp-otp-auth.spec.ts`(185行) |
| 10 | ✅ | `otp/firebase-admin-client.ts`(REST)+`identity-verification-provider.ts`(+test) |
| 11 | 🟡 | 再送クールダウン・期限は実装。月次送信上限(Counter)と独立ジョブ化は残 |
| 12 | ✅ | `add-signers.tsx` で宛先ごとの認証レベル選択 |
| 13 | ✅ | `packages/lib/server-only/ekyc/ekyc.ts`(MockEkycProvider) |
| 14 | 🟡 | 証明書への本人確認記載は実装。PDFテキスト抽出アサーション(R2-1)は残 |
| 15 | ✅ | `recipient/token-lifecycle.ts`+`expire-recipients-sweep` 連携 |
| 16 | ✅ | `recipient/token-lifecycle.ts`(+test) |
| 17 | ✅ | 完了後失効(`signing-session.ts`/`token-lifecycle.ts`) |
| 18 | ⬜ | 閲覧/署名リンク分離は未実装 |
| 19 | 🟡 | `signing-session.ts` あり。2コンテキスト同時アクセス E2E(R2-2)は残 |
| 20 | ✅ | IP/UA 記録(監査ログ+otp-audit-logs) |
| 21 | ✅ | `rate-limit/signing-rate-limits.ts` |
| 22 | ⬜ | ダウンロード証明(R2-3)は未実装 |
| 23 | ✅ | `jp-access-control.spec.ts`(117行) |
| 24 | ✅ | `docs/plans/phase2-reminder-gap-analysis.md` |
| 25 | ✅ | `envelope/automation-settings.ts`+`20261015000003_add_envelope_automation_settings` |
| 26 | 🟡 | ja 文面は web.po。オーナー宛コピーは未確認 |
| 27 | ✅ | 有効期限 UI+自動キャンセル(`jp-reminder-expiry.spec.ts` で担保) |
| 28 | ✅ | `jp-reminder-expiry.spec.ts`(136行) |
| 29 | ✅ | `find-documents-internal.ts` 拡張+`universal/dashboard-progress.ts`(+test) |
| 30 | ✅ | `packages/ui/components/general/dashboard/dashboard-4col.tsx` |
| 31 | 🟡 | 締結証明書は生成済み。完了メールへの自動添付(`send-document-completed-emails` 改修)は未確認 |
| 32 | 🟡 | リマインダー ON/OFF は実装。完了/期限通知の個別 ON/OFF は未確認 |
| 33 | ⬜ | 視覚回帰スナップショット未追加 |
| 34 | 🟡 | 翻訳チェック0件。手動 a11y チェックリストの記録なし |
| 35 | 🟡 | レート制限・トークン実装済み。セキュリティレビュー記録なし |
| 36 | ✅ | 全 jp spec コミット済み(フル実行は CI 要確認) |

---

## 1. 目的とゴール

- 取引先が**アカウント登録なし**で、なりすましを防ぐ本人確認(メールOTP標準/Firebase Authentication (Google) のメール認証オプション)を通過できるようにする。SMS認証は採用しない。
- 署名リンクの**有効期限・再送ローテーション・完了後失効・同時アクセス制御・レート制限**を実装し、URL持ち回りリスクを排除する。
- 契約が止まらない仕組み(自動リマインダー・有効期限・進捗ダッシュボード・完了自動送付)を提供する。

### 成功基準
1. メールOTP・Firebaseメール認証ゲートを含む署名フローが E2E で通過し、OTP総当たりがレート制限で遮断される。
2. 再送後の旧リンク・完了後のリンク・期限切れリンクがすべて無効になる E2E が通過。
3. リマインダーが設定間隔どおりに送信され、期限切れで自動キャンセル+通知される E2E が通過。
4. ダッシュボードで滞留状況が確認でき、完了時に PDF+締結証明書が自動送付される。
5. フェーズ1で作成した全リグレッションテストが引き続きグリーン。

## 2. 対象アーキテクチャと主要ファイル

| 領域 | パス | 役割 |
| --- | --- | --- |
| 受取人認証 | `packages/lib/types/document-auth.ts` | 認証タイプ定義(ACCOUNT/PASSKEY/TWO_FACTOR_AUTH/PASSWORD/EXPLICIT_NONE) |
| 署名画面 | `apps/remix/app/routes/_recipient+/d.$token+` | OTPゲートUIの設置先 |
| 匿名検証 | `packages/prisma/schema.prisma`(model AnonymousVerificationToken) | 署名者の一時検証トークン |
| OTP生成 | `packages/lib/server-only/crypto/` | ランダム生成・ハッシュ |
| レート制限 | `packages/lib/server-only/rate-limit/`、model RateLimit | 総当たり対策 |
| 本人確認(Firebase Auth) | `firebase-admin`(新規依存)、`packages/lib/server-only/otp/` | Firebase Authentication のメール認証(メールリンク発行・検証)。MEDIUMレベル |
| ジョブ | `packages/lib/jobs/definitions/`(send-signing-reminders-sweep / process-signing-reminder / expire-recipients-sweep / process-recipient-expired / seal-document / send-document-completed-emails) | リマインダー・期限・完了処理の既存基盤 |
| メール | `packages/email/templates/` | OTP・リマインダー・期限切れ通知テンプレート |
| 監査 | `packages/lib/server-only/document-audit-logs.ts` | OTP検証・アクセス記録(フェーズ1でハッシュチェーン化済み) |
| 証明書 | `packages/lib/server-only/`(締結証明書生成) | 本人確認結果の同梱 |
| 一覧 | `packages/trpc/server/`(envelope-router / document-router) | ダッシュボード用クエリ拡張 |
| テスト | `packages/app-tests/e2e/`、`packages/app-tests/visual-regression/`、`packages/lib/**/*.test.ts` | リグレッション防止 |

## 3. 実装ステップ(1〜36)

### Stage A: 設計と基盤(ステップ1〜3)

**ステップ1. ブランチ整備と認証系ベースライン計測(想定: 0.5日)**
- 内容: フェーズ2ブランチを作成し、既存の署名認証(ACCOUNT/PASSKEY/2FA/PASSWORD)に関わる E2E・ユニットの実行結果をベースラインとして記録する。
- 対象: 記録のみ(`docs/plans/phase2-baseline.md`)
- 検証: 既存認証フローの spec 一覧と結果が記録されていること。

**ステップ2. 認証レベル設計と document-auth 拡張(想定: 1日)**
- 内容: 認証レベルを LOW=メールOTP(自社実装) / MEDIUM=Firebase Authentication (Google) のメール認証(メールリンク+確認済みセッション) / HIGH=eKYC(オプション)として定義し、`document-auth.ts` に `EMAIL_OTP` / `FIREBASE_EMAIL` の auth タイプを追加(Zod 判別ユニオン拡張)。SMS認証は採用しない。既存タイプとの併用可否を明文化。
- 対象: `packages/lib/types/document-auth.ts`、設計書新規
- 検証: Zod スキーマのユニットテスト(新タイプのパース・既存タイプの後方互換)。

**ステップ3. スキーマ設計とマイグレーション(想定: 1日)**
- 内容: Recipient(または DocumentMeta)に認証レベル設定と、OTP 用のハッシュ・有効期限・試行回数を保持するカラム/テーブルを追加するマイグレーションを作成。
- 対象: `packages/prisma/schema.prisma`、`packages/prisma/migrations/`
- 検証: `migrate dev` 成功。既存レコード不変。tRPC 型生成が壊れないこと(`npx tsc --noEmit`)。

### Stage B: メールOTP(ステップ4〜9)

**ステップ4. OTP発行・検証ユーティリティ(想定: 1日)**
- 内容: 6桁OTPの生成(`crypto.randomInt`)・SHA-256ハッシュ保存・有効期限(既定10分)・最大試行回数(5回)・再送クールダウン(60秒)を実装。
- 対象: `packages/lib/server-only/crypto/`、新規 `otp.ts`
- 検証: Vitest(生成範囲/ハッシュ一致/期限切れ/試行上限/クールダウン)。

**ステップ5. OTPメールテンプレートと送信ジョブ(想定: 1日)**
- 内容: OTP送信メール(ja)を react-email で作成し、`send-otp-email` ジョブ定義(`packages/lib/jobs/definitions/` の規約に従う)を追加。
- 対象: `packages/email/templates/`、`packages/lib/jobs/definitions/`
- 検証: Inbucket で OTP メール受信を確認する E2E ヘルパーを作成。

**ステップ6. 署名画面のOTPゲートUI(想定: 1.5日)**
- 内容: `d.$token+` 署名画面の前に OTP 入力ステップを挿入(6桁入力・再送ボタン・残試行表示)。全画面は ja。
- 対象: `apps/remix/app/routes/_recipient+/d.$token+`、`packages/ui/`
- 検証: E2E(OTP通過で署名画面へ、誤入力でエラー表示)。

**ステップ7. OTP検証サーバーロジック(想定: 1日)**
- 内容: 検証成功で AnonymousVerificationToken 相当の署名セッションを発行(有効期間はセッション単位)。失敗時は試行回数をインクリメントし上限でロック。
- 対象: `packages/lib/server-only/`(recipient/document 認証ロジック)
- 検証: ユニット(成功/失敗/ロック/期限切れ)+E2E。

**ステップ8. OTPの監査ログ記録(想定: 0.5日)**
- 内容: OTP送信・検証成功・失敗・ロックを DocumentAuditLog に記録(フェーズ1のハッシュチェーンに乗る)。OTP値自体はログに残さない。
- 対象: `packages/lib/server-only/document-audit-logs.ts` 連携箇所
- 検証: 監査ログ内容のユニットテスト+締結証明書に反映されること。

**ステップ9. OTP回帰テストの統合(想定: 1日)**
- 内容: OTP系 E2E を1 spec に統合し、既存認証タイプ(PASSWORD/2FA等)との組み合わせマトリクステストを追加。
- 対象: `packages/app-tests/e2e/jp-otp-auth.spec.ts`(新規)
- 検証: 認証マトリクス全ケースがグリーン。

### Stage C: Firebaseメール認証・eKYC(ステップ10〜14)

**ステップ10. Firebase Authentication (Google) の導入(想定: 1日)**
- 内容: `firebase-admin` SDK を導入し、Firebase プロジェクト設定(サービスアカウント・APIキーを環境変数で管理)を行う。メール認証(メールリンク/メール確認)の発行・検証を、メールプロバイダと同じ戦略パターン(ts-pattern による env 切替)の抽象化層で実装。開発環境は Firebase Emulator Suite またはモック。将来的に Google アカウント(Gmail)サインインへ同一基盤で拡張できる設計にする。SMS認証のプロバイダ(Twilio 等)は実装しない。
- 対象: `package.json`(`firebase-admin` 依存追加)、新規 `packages/lib/server-only/otp/firebase-auth-provider.ts`、`packages/lib/constants/app.ts`
- 検証: プロバイダ選択のユニットテスト+Firebase Emulator でのメールリンク発行テスト。

**ステップ11. Firebaseメール認証ジョブと再送・悪用対策(想定: 1日)**
- 内容: メールリンク発行を `send-firebase-email-auth` ジョブ化。再送クールダウン(60秒)とテナント別月次送信上限(Counter model 活用、超過時はメールOTPへフォールバック)を設ける。リンクの有効期限(Firebase 既定に合わせ調整)と1回限り使用を検証し、別宛先への転送を無効化する。
- 対象: `packages/lib/jobs/definitions/`、Counter 集計ロジック
- 検証: 再送制限・期限切れ・フォールバックのユニット+E2E。

**ステップ12. 認証レベル選択UI(想定: 1日)**
- 内容: ウィザード宛先入力画面(フェーズ1)で宛先ごとに認証レベル(低/中/高)を選択可能に。説明文は ja。
- 対象: `_authenticated+/new/` ステップ2、tRPC create-envelope 拡張
- 検証: E2E(レベル選択→署名画面で該当ゲートが出ること)。

**ステップ13. eKYC(HIGH)の抽象化(想定: 1.5日)**
- 内容: 外部 eKYC(書類+自撮り)API のインターフェースとモック実装を作成(実API連携は別途契約後にプラグイン)。結果(成否・日時・プロバイダID)を保持。
- 対象: 新規 `packages/lib/server-only/ekyc/`(インターフェース+モック)
- 検証: モックでのフロー通過 E2E(LOW/MEDIUM/HIGHの切替含む)。

**ステップ14. 締結証明書への本人確認結果反映(想定: 0.5日)**
- 内容: 締結証明書PDFに「本人確認方式(メールOTP/Firebaseメール認証/eKYC)・検証日時」を記載。
- 対象: 締結証明書生成ロジック
- 検証: E2E で証明書内の本人確認記載を確認(PDFテキスト抽出アサーション)。

### Stage D: 署名リンクのアクセス制御(ステップ15〜23)

**ステップ15. リンク有効期限の設計と実装(想定: 1日)**
- 内容: 署名リンクの既定有効期限(14日)を送信画面で設定可能にし、既存 `expire-recipients-sweep` / `process-recipient-expired` ジョブと `send-owner-recipient-expired-email` を連携。
- 対象: ウィザード、`packages/lib/jobs/definitions/expire-recipients-sweep*.ts`
- 検証: 期限切れジョブ実行でリンク無効化+通知の E2E(ジョブを手動発火)。

**ステップ16. 再送時のトークンローテーション(想定: 1日)**
- 内容: 「再送」操作で recipient トークンを再生成し、旧トークンを即時無効化する。
- 対象: 再送ロジック(`packages/lib/server-only/` envelope/recipient 操作)、tRPC 再送ルート
- 検証: E2E(再送→旧URL 404→新URLで署名可能)。

**ステップ17. 署名完了後の即時失効(想定: 0.5日)**
- 内容: 全員署名完了(seal 完了)時に全 recipient トークンを失効させ、完了後の再アクセスは「完了済み」案内画面のみにする。
- 対象: `packages/lib/jobs/definitions/seal-document*.ts` 連携
- 検証: E2E(完了後リンク→案内画面、署名操作不可)。

**ステップ18. 閲覧/署名リンクの分離(想定: 1日)**
- 内容: 閲覧用(ダウンロード可・署名不可)と署名用リンクを分離し、権限に応じて操作を制限。共有リンク(DocumentShareLink)とも整理。
- 対象: `_recipient+` ルート群、`packages/lib/server-only/`
- 検証: E2E(閲覧リンクで署名フィールドが操作不可)。

**ステップ19. 1トークン1アクティブセッション制御(想定: 1.5日)**
- 内容: 同一署名トークンの同時アクセスを制御(新セッション開始時は旧セッション無効化または排他)。二重署名・競合上書きを防止。
- 対象: 署名セッション管理(`packages/lib/server-only/`)
- 検証: 2ブラウザコンテキストでの同時アクセス E2E(後勝ち/排他の仕様どおり)。

**ステップ20. IP・UA・デバイス記録の強化(想定: 0.5日)**
- 内容: 署名・閲覧・OTP検証の各イベントに IP/UA/画面サイズを記録し、監査ログと締結証明書に反映。
- 対象: 監査ログ記録箇所、証明書生成
- 検証: 記録内容のユニットテスト。

**ステップ21. レート制限の適用(想定: 1日)**
- 内容: 既存 `rate-limit` パッケージをトークンルート・OTP検証に適用(IP+トークン単位)。しきい値: OTP検証 5回/10分、署名リンクアクセス 30回/分。
- 対象: `_recipient+` ルート、`packages/lib/server-only/rate-limit/`
- 検証: しきい値超過で429+jaエラーの E2E。

**ステップ22. ダウンロード証明(想定: 1日)**
- 内容: 完了PDFのダウンロードを記録し、締結証明書に「ダウンロード履歴」を付記できるオプションを実装(誰がいつ取得したかの跡付け)。
- 対象: ダウンロードルート、証明書生成
- 検証: E2E(ダウンロード→証明書に反映)。

**ステップ23. アクセス制御E2E群の統合(想定: 1日)**
- 内容: ステップ15〜22を網羅する `jp-access-control.spec.ts` に統合し、フェーズ1のコアフローとの相互影響がないか全実行。
- 対象: `packages/app-tests/e2e/jp-access-control.spec.ts`
- 検証: `npm run test:e2e` 全グリーン。

### Stage E: 自動リマインダー・期限管理(ステップ24〜28)

**ステップ24. 既存リマインダー機能のギャップ分析(想定: 0.5日)**
- 内容: 既存 `send-signing-reminders-sweep` / `process-signing-reminder` ジョブの挙動(設定方法・既定間隔・EE制限の有無)をコードリーディングで確認し、不足点(設定UI・ja文面・オーナー宛コピー等)を文書化。
- 対象: `packages/lib/jobs/definitions/`、調査メモ新規
- 検証: ギャップ一覧がレビュー済みであること。

**ステップ25. リマインダー設定UI(想定: 1日)**
- 内容: 送信画面に「リマインダー: 3日間隔・最大3回(既定)」の設定を追加。間隔/回数/ON・OFFを DocumentMeta(または TeamGlobalSettings)に保存。
- 対象: ウィザード、`packages/prisma/schema.prisma`
- 検証: 設定値がジョブに反映されるユニット+E2E。

**ステップ26. リマインダーメールのja化とオーナー宛コピー(想定: 0.5日)**
- 内容: リマインダー文面を ja 化し、送信者にも控え(copy)を送るオプションを追加。
- 対象: `packages/email/templates/`
- 検証: Inbucket で ja リマインダー受信を確認。

**ステップ27. 有効期限のUI設定と自動キャンセル通知(想定: 1日)**
- 内容: 送信画面に有効期限(7/14/30日/無期限)の選択を追加。期限切れ時は自動キャンセル+送信者通知(既存 `send-owner-recipient-expired-email` を ja 対応で活用)。
- 対象: ウィザード、期限ジョブ連携
- 検証: E2E(期限設定→ジョブ発火→キャンセル+通知)。

**ステップ28. リマインダー・期限E2Eの統合(想定: 1日)**
- 内容: 時間経過を含むシナリオをジョブ手動発火+モック時計で検証する spec を作成。
- 対象: `packages/app-tests/e2e/jp-reminder-expiry.spec.ts`
- 検証: 全シナリオグリーン。

### Stage F: 進捗ダッシュボードと総合検証(ステップ29〜36)

**ステップ29. 一覧クエリの拡張(想定: 1日)**
- 内容: tRPC の find-envelopes 相当ルートに「現在の署名者・滞留日数・期限までの日数」を含める拡張(インデックス見直し含む)。
- 対象: `packages/trpc/server/`、`packages/prisma/schema.prisma`(インデックス)
- 検証: クエリのユニットテスト+パフォーマンス目視(100件表示で1秒以内)。

**ステップ30. ダッシュボード4列UI(想定: 2日)**
- 内容: 「承認待ち/署名中/締結済み/期限切れ」の4列ビュー+滞留バッジ表示。モバイルは1列縦積み。
- 対象: `apps/remix/app/routes/_authenticated+/`、`packages/ui/`
- 検証: 視覚回帰+E2E(状態遷移でカードが移動すること)。

**ステップ31. 完了時のPDF+証明書自動送付(想定: 1日)**
- 内容: `send-document-completed-emails` を拡張し、全員完了時に締結済みPDF+締結証明書を全署名者・送信者へ自動添付送信(添付サイズ上限時はリンク方式にフォールバック)。
- 対象: `packages/lib/jobs/definitions/send-document-completed-emails*.ts`
- 検証: E2E(完了→全員に添付メール受信)。

**ステップ32. 通知設定のON/OFF(想定: 0.5日)**
- 内容: リマインダー・完了通知・期限通知を送信者/テナント設定で ON/OFF 可能に(TeamGlobalSettings 活用)。
- 対象: 設定UI、ジョブ側の分岐
- 検証: OFF 時にメールが飛ばない E2E。

**ステップ33. ダッシュボードの視覚回帰とモバイル確認(想定: 0.5日)**
- 内容: ダッシュボードの視覚回帰を追加し、モバイル幅(iPhone/Android project)での表示崩れを検証。
- 対象: `packages/app-tests/visual-regression/`
- 検証: スナップショット承認完了。

**ステップ34. アクセシビリティ・i18n 確認(想定: 0.5日)**
- 内容: 新UI(OTPゲート・ダッシュボード・設定)の ja 翻訳漏れチェックとキーボード操作・コントラスト確認。
- 対象: `scripts/check-translations.mjs` 実行+手動チェックリスト
- 検証: 翻訳チェック0件、チェックリスト完了。

**ステップ35. セキュリティレビュー(想定: 1日)**
- 内容: OTP総当たり耐性、トークンエントロピー(cuid 桁数/予測不能性)、機微情報(OTP・Firebase セッション識別子)のログ非出力、Firebaseメールリンクの転送悪用対策(1回限り使用・テナント横断の再送レート制限)、をレビューし指摘を修正。
- 対象: コードレビュー+修正
- 検証: レビュー記録と修正コミット。 penetrate 的な自動テスト(レート制限発火)が通っていること。

**ステップ36. フェーズ2総合リグレッションとリリース判定(想定: 1日)**
- 内容: `npm run lint` → `npx tsc --noEmit` → Vitest → `npm run test:e2e`(コア/OTP/アクセス制御/リマインダー/ダッシュボード)→ 視覚回帰の全実行。ベースライン(ステップ1)との差分確認とリリース判定。
- 対象: 全体、CI
- 検証: 第4章チェックリスト全グリーン。

## 4. リグレッション防止テスト計画

### 4.1 テスト一覧

| レイヤー | 対象 | ファイル | 実行タイミング |
| --- | --- | --- | --- |
| ユニット(Vitest) | OTP生成/検証/期限/試行上限/クールダウン | `packages/lib/server-only/**/*.test.ts` | 各PR |
| ユニット(Vitest) | Firebase/eKYCプロバイダ選択・フォールバック | 同上 | 各PR |
| ユニット(Vitest) | トークンローテーション・失効ロジック | 同上 | 各PR |
| ユニット(Vitest) | document-auth 拡張スキーマ(後方互換) | `packages/lib/types/*.test.ts` | 各PR |
| E2E | OTP・Firebaseメールリンクゲート(送信/入力/誤答/ロック/期限切れ) | `jp-otp-auth.spec.ts` | 各PR |
| E2E | アクセス制御(期限/再送/完了後/同時/レート制限) | `jp-access-control.spec.ts` | 各PR |
| E2E | リマインダー・期限(ジョブ発火) | `jp-reminder-expiry.spec.ts` | 各PR |
| E2E | ダッシュボード状態遷移 | `jp-dashboard.spec.ts` | 各PR |
| 視覚回帰 | OTPゲート・ダッシュボード・認証レベル選択 | `packages/app-tests/visual-regression/` | UI変更PR |
| セキュリティ | レート制限発火・ログ非出力 | E2E+レビュー | リリース前 |

### 4.2 既存機能保護(壊してはいけないもの)
- 既存認証タイプ(ACCOUNT/PASSKEY/TWO_FACTOR_AUTH/PASSWORD/EXPLICIT_NONE)の署名フロー。
- OTP を設定していない従来の即時署名フロー(後方互換)。
- フェーズ1のコアフロー・ウィザード・モバイル署名・法務系 spec。
- webhook 発火・seal-document ジョブの挙動。

### 4.3 CI 組み込み
- PR: lint → tsc → Vitest → E2E(コア+新規認証系)→ 視覚回帰。
- 週次: E2E フル+ジョブ系シナリオ(cron による定時実行)を追加。
- セキュリティ系テストは必須チェック(reviews required)に設定。

## 5. リリース計画とロールバック
- OTPは「テナント単位で段階的に既定ON」にできる feature flag 付きでリリース(異常時に即時無効化)。
- スキーマ変更(OTP列・セッション管理)は追加のみで後方互換。ロールバック時は flag を OFF にするだけで旧挙動に戻る設計。
- Firebase送信量は quota 監視+OTPフォールバックで暴走防止。

## 6. リスクと対策

| リスク | 対策 |
| --- | --- |
| OTPで署名離脱が増える | フォーマー向けに「OTPなし」設定を許容(送信者が選択)。離脱率を計測し既定値を調整 |
| Firebaseメールリンクの到達性低下(迷惑メール化) | SPF/DKIM/DMARC設定+送信ドメイン評価、メールOTPへのフォールバック。HIGHレベル(eKYC)は課金オプション |
| 期限切れによる契約消失 | 期限前リマインダー(3日前)を既定ON、送信者へ早期警告 |
| 同時アクセス制御の誤検知(同一ユーザーの再接続) | セッション失効に猶予時間(数分)を設け、再接続時はシームレス再開 |
| 監査ログ肥大化 | テナント別保持期間設定+アーカイブ設計(フェーズ3で再確認) |

## 7. 完了定義(DoD)
1. 第1章の成功基準1〜5を満たす。
2. 第4章の全テストが CI でグリーン。
3. セキュリティレビュー(ステップ35)の指摘が全て解消済み。
4. 運用マニュアル(OTP設定・リマインダー設定・期限管理)の ja ドキュメントが整備済み。
