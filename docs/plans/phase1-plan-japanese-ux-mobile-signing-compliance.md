# フェーズ1 実装計画書: 日本語UX・モバイル手書き署名・法規制対応(タイムスタンプ/電帳法)

| 項目 | 内容 |
| --- | --- |
| 対象提案 | 案1(全面日本語化・3ステップ送信ウィザード)/ 案2(モバイル手書き署名)/ 案3(タイムスタンプ+PAdES標準装備)/ 案4(電帳法対応監査証跡) |
| 期間目安 | 6〜8週間(2〜3名想定) |
| ステップ数 | 36ステップ(Stage A〜F) |
| 前提 | 本リポジトリ(Documenso フォーク)を SaaS 化するブランチ戦略が決まっていること |
| テスト方針 | 各Stageでリグレッション防止テストを併せて作成(第4章参照)。ステップ内の「検証」はコミット前の必須確認事項 |

---

## 1. 目的とゴール

- ITリテラシーが高いとは言えない中小企業担当者が、**迷わず3ステップで契約書を送信**できるようにする。
- 取引先が**スマホ/タブレットのタッチ操作だけで手書きサイン**を完結できるようにする。
- **PAdES準拠の電子署名+RFC3161タイムスタンプ**を標準付与し、改ざん検知を運用なしで実現する。
- **電子帳簿保存法**(真実性・検索要件)と**電子署名法**に対応した監査証跡(ハッシュチェーン+締結証明書)を提供する。

### 成功基準
1. 送信→署名→完了の全画面が日本語で表示され、未訳文言が0件。
2. 新規ウィザードで送信完了までのクリック数が現行比 50% 減(目安: 10クリック→5クリック以内)。
3. iPhone/Android エミュレーションで手書き署名→完了PDF閲覧が E2E で通過。
4. 完了PDFにタイムスタンプ・署名が含まれ、改変検知テストが通過。
5. 監査ログのハッシュチェーン検証テストが通過し、締結証明書に監査ログが同梱される。

## 2. 対象アーキテクチャと主要ファイル

| 領域 | パス | 役割 |
| --- | --- | --- |
| 翻訳 | `packages/lib/translations/{en,ja}/web.po`、`lingui.config.ts`、`crowdin.yml` | Lingui による ja 翻訳リソース |
| ドキュメントメタ | `packages/prisma/schema.prisma`(model DocumentMeta) | language / timezone / dateFormat / 署名方式フラグ(typedSignatureEnabled 等) |
| 送信UI | `apps/remix/app/routes/_authenticated+/`、`packages/ui/` | 送信フロー画面 |
| 署名UI | `apps/remix/app/routes/_recipient+/d.$token+`、`packages/ui/primitives/signature-pad/*` | 署名者向け画面・署名パッド(canvas.ts / point.ts / signature-pad-draw.tsx / signature-pad-dialog.tsx / signature-render.tsx) |
| PDF署名 | `packages/signing/`(index.ts / transports/local.ts / transports/google-cloud.ts / helpers/tsa.ts)、`packages/lib/constants/app.ts` | P12 / Google Cloud KMS / TSA |
| 検証 | `packages/lib/server-only/cert/cert-status.ts` | 署名・タイムスタンプ検証ステータス |
| 監査 | `packages/prisma/schema.prisma`(model DocumentAuditLog)、`packages/lib/server-only/document-audit-logs.ts` | 監査ログ記録 |
| テスト | `packages/app-tests/e2e/`、`packages/app-tests/visual-regression/`、`packages/lib/**/*.test.ts`(Vitest) | E2E / 視覚回帰 / ユニット |

## 3. 実装ステップ(1〜36)

### Stage A: 基盤整備とテスト基盤(ステップ1〜6)

**ステップ1. 作業基盤とリグレッション・ベースラインの計測(想定: 0.5日)**
- 内容: フェーズ1用の作業ブランチを作成し、現行 main の `npm run lint`・`npx tsc --noEmit`・`npm run test:e2e` を実行してベースライン結果(合格/不合格リスト)を `docs/plans/phase1-baseline.md` に記録する。
- 対象: リポジトリ全体(変更なし/記録のみ)
- 検証: ベースライン文書にテスト結果・既知の失敗が明記されていること。

**ステップ2. コアフローのE2Eリグレッションspec新規作成(想定: 1日)**
- 内容: 「送信→メール受信→署名→完了→完了PDF検証」の一連フローを既存 spec の流儀に合わせて `packages/app-tests/e2e/jp-core-signing-flow.spec.ts` として作成する。以降の全ステップはこの spec を壊さないことを原則とする。
- 対象: `packages/app-tests/e2e/jp-core-signing-flow.spec.ts`(新規)
- 検証: `npm run test:dev -w @documenso/app-tests` で通過すること。

**ステップ3. ja 既定化のDBマイグレーション設計(想定: 0.5日)**
- 内容: `DocumentMeta.language`(既定 `en`)と `DocumentMeta.timezone`(既定 `Etc/UTC`)の既定値を `ja` / `Asia/Tokyo` に変更する Prisma マイグレーションを設計・作成する。既存レコードは変更しない(新規作成分のみ既定適用)方針をコメントに明記する。
- 対象: `packages/prisma/schema.prisma`、`packages/prisma/migrations/`(新規マイグレーション)
- 検証: ローカルDBで `migrate dev` が成功し、既存データが不変であること(`npm run prisma:studio` で目視)。

**ステップ4. 日本語の日付・金額フォーマット定義追加(想定: 1日)**
- 内容: dateFormat 選択肢に `yyyy年M月d日` / `yyyy年M月d日 H時m分` を追加し、金額表示(円・3桁カンマ・税込表記)のユーティリティを `packages/lib` に追加する。Vitest ユニットテストを併設する。
- 対象: `packages/lib/universal/`(フォーマットユーティリティ)、`packages/lib/**/*.test.ts`(新規)
- 検証: Vitest(`packages/lib/vitest.config.ts`)で日付・金額フォーマットのテストが通過すること。

**ステップ5. タイムゾーン・ロケール表示の統一(想定: 0.5日)**
- 内容: 署名画面・完了画面で DocumentMeta の timezone/language を参照して表示を統一する(サーバー時刻の直接表示を排除)。
- 対象: `apps/remix/app/routes/_recipient+/`、`packages/ui/`
- 検証: ステップ2の spec に「署名画面の日本語日時表示」アサーションを追加して通過させる。

**ステップ6. 翻訳漏れ検知のCI化(想定: 1日)**
- 内容: `npx lingui extract` を実行し、ja/web.po の未訳(msgstr 空欄)一覧を出力するスクリプトを作成。未訳があったら失敗する CI ジョブを `.github/workflows/` に追加する。
- 対象: `scripts/check-translations.mjs`(新規)、`.github/workflows/`(修正)
- 検証: 未訳を1件意図的に残して CI が失敗→解消で成功することを確認。

### Stage B: 全面日本語化(ステップ7〜12)

**ステップ7. 署名者向け画面の完訳(想定: 1.5日)**
- 内容: ja/web.po のうち署名者向け文言(署名案内・フィールドラベル・完了画面・エラー)を完訳する。`<Trans>` / `t` マクロの規約(AGENTS.md)を遵守する。
- 対象: `packages/lib/translations/ja/web.po`、`packages/ui/`、`apps/remix/app/routes/_recipient+/`
- 検証: ステップ6の翻訳チェックスクリプトが署名者画面分で0件になること。

**ステップ8. 送信者・管理画面の完訳(想定: 1.5日)**
- 内容: 送信・テンプレート・ドキュメント一覧・設定画面の文言を完訳する。
- 対象: `packages/lib/translations/ja/web.po`、`apps/remix/app/routes/_authenticated+/`
- 検証: 翻訳チェック0件。主要画面を ja で目視確認。

**ステップ9. メールテンプレートの日本語対応(想定: 1.5日)**
- 内容: 署名依頼・完了通知・キャンセル等のメールを DocumentMeta.language を参照して ja で送信できるようにする(react-email テンプレートのロケール分岐)。差出人表示名・件名も ja 化。
- 対象: `packages/email/templates/`、`packages/lib/server-only/document-email.ts`
- 検証: ローカルの Inbucket(http://localhost:9000)で ja メールを受信し、レイアウト崩れがないこと。

**ステップ10. エラーメッセージの日本語マップ(想定: 1日)**
- 内容: `AppError` のエラーコードに対する ja 表示マップを `packages/lib` に追加し、フロント側は `AppError.parse(error)` の結果を ja で表示する。
- 対象: `packages/lib/errors/`(または AppError 定義箇所)、`packages/ui/`
- 検証: エラー発生E2E(期限切れリンク等)で ja メッセージが表示されるアサーションを追加。

**ステップ11. 氏名・住所入力の日本式対応(想定: 0.5日)**
- 内容: 宛先入力・署名者名入力を「姓/名」の順序・ラベルに対応させる(氏名結合ロジックは `packages/lib/types/name.ts` の既存ロジックを活用)。
- 対象: `packages/lib/types/name.ts`、宛先入力コンポーネント
- 検証: 姓/名を分離入力→PDF上の NAME フィールドに「姓 名」順で描画されるユニットテスト。

**ステップ12. 和暦オプションと視覚回帰テスト(想定: 1日)**
- 内容: dateFormat に和暦(令和 表記。`Intl.DateTimeFormat('ja-JP-u-ca-japanese')` ベース)を追加し、設定画面のプレビューに反映する。
- 対象: `packages/lib/universal/`(日付ユーティリティ)、テンプレート/送信画面の日付設定UI
- 検証: 和暦変換の Vitest テスト(境界日含む)+ ja 表示の視覚回帰(第4章参照)を追加して通過。

### Stage C: 3ステップ送信ウィザード(ステップ13〜20)

**ステップ13. ウィザード仕様とルーティング設計(想定: 1日)**
- 内容: 「①アップロード → ②宛先 → ③フィールド配置・送信」の3ステップ仕様(画面遷移図・状態遷移・中断/再開仕様)を `docs/plans/phase1-wizard-spec.md` に作成。ルートは `apps/remix/app/routes/_authenticated+/new/` 配下にステップ別分割とする(Remix の `(params: Route.Params)` 規約遵守)。
- 対象: ドキュメント新規、ルート雛形
- 検証: 仕様書レビュー完了。`npx tsc --noEmit` 通過。

**ステップ14. ステップ1: PDFアップロード画面(想定: 1.5日)**
- 内容: 既存のアップロード機構(`packages/lib/universal/upload/`)を利用した新規ステップ1画面。ドラッグ&ドロップ+プレビュー+複数PDF対応。エラーは ja 表示。
- 対象: `_authenticated+/new/` のステップ1ルート、`packages/ui/`(新規コンポーネント)
- 検証: E2E でPDFアップロード→プレビュー表示をアサート。

**ステップ15. ステップ2: 宛先入力画面(想定: 1.5日)**
- 内容: 姓/名/メール/署名順(先方→自社/自社→先方)のシンプル入力。Zod スキーマ + react-hook-form(AGENTS.md 規約)。取引先アドレス帳(後続フェーズの基盤)への参照フィールドは隠し機能として準備。
- 対象: ステップ2ルート、Zod スキーマ(`packages/lib/types/` 拡張)
- 検証: E2E で宛先入力→次へ遷移。不正メールで ja エラー表示をアサート。

**ステップ16. ステップ3: フィールド配置(簡易モード)(想定: 2日)**
- 内容: 既存のフィールド配置エディタに「簡易モード」を追加。デフォルトで署名欄(SIGNATURE)+日付(DATE)を自動配置し、詳細モードへの切替のみ自由配置を許可。
- 対象: エンベロープ編集UI(`packages/lib/server-only/envelope-editor.ts` 連携)、`packages/ui/`
- 検証: E2E で簡易モード自動配置→送信まで進行できること。

**ステップ17. 確認・送信と tRPC 連携(想定: 1日)**
- 内容: 送信前確認画面(宛先・件名・有効期限の要約)→ `create-envelope` 相当の tRPC ルート呼び出し。tRPC ルート規約(ルート別ファイル + `.types.ts`、`Z[RouteName]RequestSchema`)を遵守。
- 対象: ステップ3ルート、`packages/trpc/server/`
- 検証: 送信成功→署名依頼メール発火(job 定義 `send-signing-email`)を E2E で確認。

**ステップ18. 下書き保存・再開(想定: 1日)**
- 内容: ウィザード途中で離脱した場合、Draft ステータスのエンベロープとして保存し、一覧から「続ける」で再開できるようにする。
- 対象: ウィザード各ルート、ドキュメント一覧
- 検証: E2E で途中保存→再開→送信完了の一連が通ること。

**ステップ19. ナビゲーションの簡素化(想定: 0.5日)**
- 内容: サイドバーの初期表示を「新規送信 / ドキュメント / テンプレート / 設定」に絞り、組織・チーム・API・Embedding 等を「詳細設定」配下へ退避(機能は削除しない)。
- 対象: `packages/ui/`(ナビゲーション)、`apps/remix/app/routes/_authenticated+/`
- 検証: 視覚回帰テスト+既存ナビE2E(詳細設定のリンク到達)が通過。

**ステップ20. ウィザードのE2Eと既存送信フローのリグレッション(想定: 1日)**
- 内容: ウィザード全体の E2E を仕上げ、旧送信フローの既存 spec も引き続き通ることを確認(並行運用期間を設けるため旧フローは残置)。
- 対象: `packages/app-tests/e2e/`(新規 spec + 既存 spec 修正)
- 検証: `npm run test:e2e` で新旧フローともグリーン。

### Stage D: モバイル手書き署名(ステップ21〜26)

**ステップ21. 署名パッドのタッチ最適化(想定: 1日)**
- 内容: `signature-pad-draw.tsx` に `touch-action: none` を設定し、PointerEvent の setPointerCapture / cancel 対応、`point.ts` の DPI 計算(`packages/lib/constants/signatures.ts` の SIGNATURE_CANVAS_DPI)を高DPI端末で再検証する。
- 対象: `packages/ui/primitives/signature-pad/{signature-pad-draw.tsx,point.ts,canvas.ts}`
- 検証: Playwright のタッチデバイスエミュレーション(iPhone/Android project)で描画→確定のE2Eを追加して通過。

**ステップ22. モバイル全画面署名ダイアログ(想定: 1.5日)**
- 内容: モバイル判定時に `signature-pad-dialog.tsx` を全画面シート化。画面回転時のキャンバスリサイズ追従、確定/やり直しボタンの大型化。
- 対象: `packages/ui/primitives/signature-pad/signature-pad-dialog.tsx`
- 検証: 縦横両向きの視覚回帰+E2E を追加して通過。

**ステップ23. 署名方式の絞り込み(簡易モード)(想定: 0.5日)**
- 内容: DocumentMeta の既存フラグ(`typedSignatureEnabled` / `uploadSignatureEnabled` / `drawSignatureEnabled`)を送信者が制御できる UI をウィザードに追加。簡易モード既定は「手書きのみ」。
- 対象: ウィザードステップ3、署名タブ UI(`signature-tabs.tsx`)
- 検証: 手書きのみ設定時に入力/アップロードタブが非表示になる E2E。

**ステップ24. 線幅・スタイルと色の固定(想定: 0.5日)**
- 内容: 手書き線をやや太めに調整し、簡易モードではカラーピッカー(`signature-pad-color-picker.tsx`)を非表示にして黒固定。
- 対象: `signature-pad-draw.tsx`、`signature-pad-color-picker.tsx`
- 検証: 視覚回帰(線の太さ・色)+既存カラーピッカーの詳細モードが壊れていないこと。

**ステップ25. 印影(会社印)フィールドの追加(想定: 2.5日)**
- 内容: SIGNATURE フィールドの fieldMeta 拡張(ZFieldSignatureFieldMeta)で円形クロップ(印影)モードを追加。透過PNGのアップロード→円形レンダリング→PDF埋め込みを `signature-render.tsx` に実装。
- 対象: `packages/lib/types/field-meta.ts`、`packages/ui/primitives/signature-pad/signature-pad-upload.tsx`、`signature-render.tsx`、PDF挿入ロジック(`packages/lib/server-only/`)
- 検証: 印影付き完了PDFの生成を E2E+ユニット(画像変換ロジック)で確認。

**ステップ26. モバイル署名E2Eと視覚回帰の仕上げ(想定: 1日)**
- 内容: Stage D の全体 E2E(スマホで署名→日付→完了PDF閲覧)とビジュアル回帰を整備し、PCフローのリグレッションも全実行。
- 対象: `packages/app-tests/e2e/`、`packages/app-tests/visual-regression/`
- 検証: `npm run test:e2e` 全グリーン。

### Stage E: タイムスタンプ+PAdES標準装備(ステップ27〜31)

**ステップ27. TSA のデフォルト有効化(想定: 1日)**
- 内容: `NEXT_PRIVATE_SIGNING_TIMESTAMP_AUTHORITY`(`packages/lib/constants/app.ts`)未設定時に警告ログ+管理画面バナーを表示。SaaS 本番環境変数に TSA URL(複数候補)を設定。`helpers/tsa.ts` に障害時フォールバック(タイムアウト時の署名継続ポリシー)を実装。
- 対象: `packages/lib/constants/app.ts`、`packages/signing/helpers/tsa.ts`
- 検証: TSA ダウンを擬制したユニットテストでポリシーどおり動作すること。

**ステップ28. 本番署名トランスポートの標準化(想定: 1日)**
- 内容: 本番は `gcloud-hsm`(`packages/signing/transports/google-cloud.ts`)を必須とし、`local`(P12)は NODE_ENV=development/test のみ許可する起動時バリデーションを追加。設定ガイドを `docs/` に追記。
- 対象: `packages/signing/index.ts`、`docs/`
- 検証: 誤設定(本番でlocal)時に起動失敗するテスト。

**ステップ29. LTV・証明書チェーン埋め込みの確認(想定: 1日)**
- 内容: 署名完了PDFに LTV(長期検証)情報と TSA トークンが埋め込まれることを `@libpdf/core` の出力で検証するスクリプト/テストを追加し、必要なら署名オプションを調整。
- 対象: `packages/signing/`、検証スクリプト新規
- 検証: Adobe Reader 相当での検証が可能な形式であること(検証スクリプト結果を記録)。

**ステップ30. 署名検証ステータスUI(想定: 1.5日)**
- 内容: `cert-status.ts` の `getCertificateStatus` を完了PDF画面・管理画面に表示(「電子署名: 有効 / タイムスタンプ: あり / 検証日時」)。ja 文言対応。
- 対象: `packages/lib/server-only/cert/cert-status.ts`、完了PDF表示UI
- 検証: E2E で完了PDF画面に検証バッジが表示されること。

**ステップ31. PDF改変検知のユニットテスト(想定: 1日)**
- 内容: 署名済みPDFのバイト列を改変→検証失敗となるテスト、ハッシュ一致/不一致のテストを Vitest で作成。
- 対象: `packages/signing/` 配下のテスト新規
- 検証: 改変検知テストが通過(改変が検出されること)。

### Stage F: 電子帳簿保存法対応の監査証跡(ステップ32〜36)

**ステップ32. 監査ログのハッシュチェーン化(想定: 2日)**
- 内容: DocumentAuditLog に `prevHash` / `hash` 列を追加するマイグレーション。`document-audit-logs.ts` に記録時ハッシュ計算(SHA-256、前レコードハッシュ連結)を実装。過去レコードはバックフィル(遡及計算)スクリプトで埋める。
- 対象: `packages/prisma/schema.prisma`、`packages/lib/server-only/document-audit-logs.ts`、バックフィルスクリプト新規
- 検証: チェーン検証ユニットテスト(連続性・改変検知)が通過。

**ステップ33. 監査ログの削除・編集経路の排除(想定: 0.5日)**
- 内容: 監査ログを更新・削除するコード経路(カスケード含む)を棚卸しし、API露出がないことを確認。エンベロープ削除時も監査ログは論理保持(SetNull の envelopeId 参照のみ許可)。
- 対象: `packages/prisma/schema.prisma`、`packages/trpc/server/`、`packages/api/`
- 検証: 監査ログ更新を試みるコードが型レベル/テストレベルで検出されること(検査テスト追加)。

**ステップ34. 締結証明書PDFの拡張(想定: 2日)**
- 内容: 完了時に生成する締結証明書に「監査ログ一覧(日時/種別/IP/UA)+ハッシュチェーン検証結果+署名・タイムスタンプ情報」を同梱する。PDF生成は既存の html→pdf 機構(`packages/lib/server-only/htmltopdf/`)を利用。
- 対象: `packages/lib/server-only/`(証明書生成)、`packages/lib/jobs/definitions/seal-document*.ts`
- 検証: E2E で完了PDF+証明書PDFの2部が保存・メール添付されること。

**ステップ35. 検索用メタデータとCSV出力(想定: 2日)**
- 内容: 契約種別・取引先名・金額・締結日を DocumentMeta に追加(Zod スキーマ拡張)、一覧画面の検索条件と CSV エクスポート tRPC ルート(電帳法の検索要件対応)を実装。
- 対象: `packages/prisma/schema.prisma`、`packages/trpc/server/`、一覧UI
- 検証: E2E でメタ検索→CSVダウンロード(ヘッダ・文字コード BOM 付き UTF-8)を確認。

**ステップ36. 電帳法テスト群とフェーズ1総合リグレッション(想定: 1日)**
- 内容: ハッシュチェーン検証・証明書同梱・CSV出力の E2E/ユニットを統合し、フェーズ1全ステップのリグレッション(`npm run lint` + `npx tsc --noEmit` + Vitest + `npm run test:e2e`)を実行してリリース判定を行う。
- 対象: `packages/app-tests/`、CI 設定
- 検証: 第4章のチェックリスト全項目がグリーン。

## 4. リグレッション防止テスト計画

### 4.1 テストレイヤーと対象

| レイヤー | 対象 | ファイル/場所 | 実行タイミング |
| --- | --- | --- | --- |
| ユニット(Vitest) | 日付・和暦・金額フォーマット、氏名結合、OTP以外の本フェーズ純関数 | `packages/lib/**/*.test.ts` | 各PR |
| ユニット(Vitest) | 監査ログハッシュチェーン、PDF改変検知、TSAフォールバック | `packages/lib/server-only/`、`packages/signing/` 配下の `.test.ts` | 各PR |
| E2E(Playwright) | コアフロー(送信→署名→完了) | `packages/app-tests/e2e/jp-core-signing-flow.spec.ts` | 各PR |
| E2E(Playwright) | ウィザード3ステップ・下書き再開 | `packages/app-tests/e2e/jp-wizard-flow.spec.ts` | 各PR |
| E2E(Playwright) | モバイルタッチ署名(タッチデバイス project) | `packages/app-tests/e2e/jp-mobile-signing.spec.ts` | 各PR |
| E2E(Playwright) | 法務系(検証バッジ・証明書同梱・CSV) | `packages/app-tests/e2e/jp-compliance.spec.ts` | 各PR |
| 視覚回帰(Playwright) | ja UI・全画面署名ダイアログ・ダッシュボード等の主要画面 | `packages/app-tests/visual-regression/` | 主要UI変更PR |
| 翻訳 | 未訳(msgstr空)検知 | `scripts/check-translations.mjs` | 各PR |
| 型チェック | 全パッケージ | `npx tsc --noEmit` | 各PR |
| 静的解析 | Biome | `npm run lint` / `npm run format` | 各PR |

### 4.2 既存機能保護(壊してはいけないもの)
- 旧送信フロー(`_authenticated+` 既存ルート)と `d.$token+` 署名フローの既存 spec。
- フィールドタイプ全種(SIGNATURE/FREE_SIGNATURE/INITIALS/NAME/EMAIL/DATE/NUMBER/RADIO/CHECKBOX/DROPDOWN/TEXT)の配置・署名・描画。
- 署名方式3種(手書き/入力/アップロード)の詳細モード(簡易モードと併存)。
- seal-document ジョブと webhook 発火(`execute-webhook`)。
- ストレージ2種(database / s3)での保存・取得。

### 4.3 CI 組み込み
- PR 時: lint → tsc → Vitest → 翻訳チェック → E2E(コア/ウィザード/モバイル)→ 視覚回帰(変更画面のみ)。
- main マージ時: `npm run test:e2e` フル実行。
- 視覚回帰の差分は PR にスナップショット差分を貼り、承認者レビューを必須化。

## 5. リリース計画とロールバック
- 段階リリース: (1) 内部テナント → (2) ベータ顧客数社 → (3) 全体。旧UI/旧送信フローは feature flag で1リリース分残置。
- マイグレーション(language/timezone 既定値、AuditLog 列追加)は後方互換。ロールバックは「コードを前バージョンへ戻す+列は残置」で復旧可能な設計。

## 6. リスクと対策

| リスク | 対策 |
| --- | --- |
| ja 翻訳の漏れ・誤訳による信頼低下 | CI 翻訳チェック+実務者レビュー(法的用語は「締結」「押印」等の用語集を作成) |
| TSA 障害で署名が止まる | 複数TSA+タイムアウト時のポリシー(署名継続/停止を設定化)、監視アラート |
| モバイルでスクロールと描画が干渉 | `touch-action: none` + 実機テスト(iOS Safari/Android Chrome)をステップ26で必須化 |
| P12 運用が残るテナント | ステップ28のバリデーションで本番禁止を強制、移行ガイド提供 |
| 簡易モードで詳細設定を使いたい層の不満 | 「詳細モード」切替を常設し、旧UIも feature flag で並行提供 |

## 7. 完了定義(DoD)
1. 第1章の成功基準1〜5を満たす。
2. 第4章の全テストが CI でグリーン。
3. ベースライン(ステップ1)から既存機能のリグレッション増加がゼロ。
4. 法務チェックリスト(タイムスタンプ・監査ログ・証明書)のレビュー記録が残っている。
