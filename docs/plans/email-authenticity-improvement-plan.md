# メールのみの真正性改善・実装計画書 (24ステップ)

> **ステータス**: **不採用・アーカイブ（REJECTED / ARCHIVED）** (2026-10-16)  
> **理由**: 中小企業特化・低価格・運用負荷極小化の方針に基づき、過剰要件を排してStage A〜E（メールOTP・自前WORMトリガー・ハッシュチェーン・電帳法事務処理規程キット）へ統合完了。

## 概要

本計画は「メールのみ」に依存しない真正性担保を強化するための実装計画である。4フェーズ・24ステップに分割し、各ステップに回帰防止テストを盛り込む。

対象スコープ:
1. **DMARC レコード生成・DNS 表示** (Steps 1-6) — なりすまし防止の最終防衛線
2. **本番ガード・SMTP 認証必須化** (Steps 7-12) — 開発デフォルトの未認証 SMTP を本番で許容しない
3. **署名リンクのステップアップ認証** (Steps 13-18) — メールリンクトークンだけで文書閲覧・署名できないようにする
4. **電帳法検証可視化・回帰テスト統合** (Steps 19-24) — 真実性担保の可視化と既存機能の回帰防止

関連既存ファイル:
- `packages/lib/utils/email-domains.ts` — DKIM/SPF レコード生成
- `packages/ee/server-only/lib/create-email-domain.ts` — SES ドメイン作成
- `packages/ee/server-only/lib/reregister-email-domain.ts` — ドメイン再登録
- `packages/email/mailer.ts` — SMTP トランスポート生成
- `packages/email/transports/mailchannels.ts` — MailChannels トランスポート (DKIM 対応済み)
- `packages/auth/server/routes/email-password.ts` — email/password 認証フロー
- `packages/lib/universal/compliance-kit.ts` — 電帳法コンプライアンスキット
- `packages/prisma/migrations/20261016000001_add_audit_log_worm_trigger/migration.sql` — WORM トリガー
- `apps/remix/app/routes/_authenticated+/t.$teamUrl+/settings.compliance.tsx` — コンプライアンス設定 UI
- `packages/app-tests/e2e/jp-core-signing-flow.spec.ts` — 署名フロー E2E

前提:
- `npm run lint` (Biome) は変更ファイルのみ実行。Windows CRLF 環境差分は既知課題として記録済み (`docs/plans/phase1-baseline.md`)。
- 型チェックは `npx tsc --noEmit -p apps/remix/tsconfig.json` (prisma generate + react-router typegen 後に実行)。
- Vitest は既知の環境起因失敗あり (`docs/plans/phase1-baseline.md` #3)。CI(Linux)結果を基準とする。

---

## Phase 1: DMARC レコード生成・DNS 表示 (Steps 1-6)

### Step 1: `generateDmarcRecord` 関数の追加

**概要:** `packages/lib/utils/email-domains.ts` に DMARC DNS TXT レコードを生成する関数を追加する。デフォルトポリシーは `reject`（厳格）。

**変更対象ファイル:**
- `packages/lib/utils/email-domains.ts`

**追加テスト:**
- `packages/lib/utils/email-domains.test.ts` 新規作成。`generateDmarcRecord('reject')` の戻り値が `v=DMARC1; p=reject; ...` を含むことを検証。

**受入基準:**
- `generateDmarcRecord('none')` / `'quarantine'` / `'reject'` がそれぞれ正しい `p=` 値を返す。
- `name` は `_dmarc`、`type` は `TXT`。

**依存関係:** なし

---

### Step 2: `generateEmailDomainRecords` に `domain` 引数を追加し DMARC を含める

**概要:** `generateEmailDomainRecords` のシグネチャを変更し、`domain` を受け取って DKIM + SPF + DMARC の 3 種類を返すようにする。既存呼び出し側は全て更新する。

**変更対象ファイル:**
- `packages/lib/utils/email-domains.ts`
- `packages/ee/server-only/lib/create-email-domain.ts` (呼び出し側更新)

**追加テスト:**
- `packages/lib/utils/email-domains.test.ts`。`generateEmailDomainRecords` が 3 件のレコードを返し、うち 1 件が DMARC であることを検証。

**受入基準:**
- 戻り値の配列長が 3 となる。
- DMARC レコードの `name` が `_dmarc` である。

**依存関係:** Step 1

---

### Step 3: `create-email-domain.ts` で DMARC レコードを生成・返却する

**概要:** SES ドメイン作成時に DKIM/SPF に加えて DMARC レコード (`p=reject`) を生成し、戻り値の `records` に含める。ユーザーは DNS に 3 種類すべてを登録する。

**変更対象ファイル:**
- `packages/ee/server-only/lib/create-email-domain.ts`

**追加テスト:**
- `packages/ee/server-only/lib/create-email-domain.test.ts` 新規作成 (モック SES クライアント使用)。`records` に DMARC レコードが含まれることを検証。

**受入基準:**
- `createEmailDomain` の戻り値 `records` に `type === 'TXT' && name === '_dmarc'` のレコードが含まれる。
- DMARC 値に `p=reject` が含まれる。

**依存関係:** Step 2

---

### Step 4: 組織メールドメイン作成ダイアログに DMARC 行を追加

**概要:** カスタムメールドメイン作成時の DNS レコード表示ダイアログに DMARC 行を追加し、コピーボタンを付与する。

**変更対象ファイル:**
- `apps/remix/app/components/dialogs/organisation-email-domain-create-dialog.tsx`

**追加テスト:**
- なし (UI 変更のみ。E2E で UI 表示を担保する場合は Phase 4 で追加)

**受入基準:**
- DKIM / SPF / DMARC の 3 行が表示される。
- 各行に「コピー」ボタンがある。

**依存関係:** Step 3

---

### Step 5: DNS レコード表示ダイアログに DMARC 行を追加

**概要:** ドメイン詳細/編集時の DNS レコード表示ダイアログ (`organisation-email-domain-records-dialog`) に DMARC 行を追加する。

**変更対象ファイル:**
- `apps/remix/app/components/dialogs/organisation-email-domain-records-dialog.tsx` (ファイル名が異なる場合は同ディレクトリの該当ファイル)

**追加テスト:**
- なし

**受入基準:**
- 既存の DKIM / SPF 行に加えて DMARC 行が表示される。

**依存関係:** Step 4

---

### Step 6: DMARC/SPF/DKIM レコード生成のユニットテスト整合

**概要:** Steps 1-5 で追加・変更したレコード生成ロジックの統合ユニットテストを整備し、CI で実行する。

**変更対象ファイル:**
- `packages/lib/utils/email-domains.test.ts` (Step 1 で作成済みの拡充)

**追加テスト:**
- DKIM + SPF + DMARC の組み合わせが重複なく生成されることを検証。
- `generateEmailDomainRecords` の引数不正時 (空文字列など) の挙動を検証。

**受入基準:**
- `npx biome check packages/lib/utils/email-domains.test.ts` が合格。
- すべてのテストケースが CI で緑。

**依存関係:** Steps 1-5

---

## Phase 2: 本番ガード・SMTP 認証必須化 (Steps 7-12)

### Step 7: `mailer.ts` `getTransport` で本番環境ガードを追加

**概要:** `NODE_ENV === 'production'` かつトランスポートが `smtp-auth` で認証情報 (`NEXT_PRIVATE_SMTP_USERNAME`/`PASSWORD`) が未設定の場合、起動時にエラーを投げる。開発デフォルトの `localhost:2500` 無認証 SMTP を本番で誤用しないようにする。

**変更対象ファイル:**
- `packages/email/mailer.ts`

**追加テスト:**
- `packages/email/mailer.test.ts` 新規作成。`NODE_ENV='production'` かつ `smtp-auth` 未認証時に `getTransport()` がエラーを投げることをモック `env` で検証。

**受入基準:**
- 本番 + `smtp-auth` + 認証情報未設定 → `Error` スロー。
- 開発環境または認証情報設定済み → 正常にトランスポート生成。

**依存関係:** なし

---

### Step 8: `EmailDomain` モデルに `VERIFIED` ステータスを追加

**概要:** Prisma スキーマの `EmailDomainStatus` に `VERIFIED` を追加し、マイグレーションファイルを作成する。未検証ドメインからの送信をブロックするための基礎データモデル拡張。

**変更対象ファイル:**
- `packages/prisma/schema.prisma` (`EmailDomainStatus` enum に `VERIFIED` 追加)
- `packages/prisma/migrations/20261016XXXXXX_add_verified_email_domain_status/migration.sql` 新規作成

**追加テスト:**
- なし (DB スキーマ変更。マイグレーション適用可否を CI で確認)

**受入基準:**
- `prisma migrate diff` または `prisma migrate dev` でエラーなくマイグレーション生成できる。
- `EmailDomainStatus` に `PENDING` / `ACTIVE` / `VERIFIED` の 3 値が存在する。

**依存関係:** なし

---

### Step 9: SES ドメイン検証完了後に `status` を `VERIFIED` に更新するフロー

**概要:** SES 側でドメイン検証が完了した (DKIM/SPF/DMARC DNS 登録済み) 時点で、`EmailDomain.status` を `VERIFIED` に更新するエンドポイントまたは内部処理を追加する。

**変更対象ファイル:**
- `packages/ee/server-only/lib/create-email-domain.ts` または新規 `verify-email-domain.ts`

**追加テスト:**
- `packages/ee/server-only/lib/verify-email-domain.test.ts` 新規。検証成功時は `VERIFIED`、失敗時は `PENDING` のままであることをモックで検証。

**受入基準:**
- SES 検証成功 → `status === EmailDomainStatus.VERIFIED` かつ `lastVerifiedAt` 更新。
- 検証失敗 → `status` は `PENDING` のまま。

**依存関係:** Step 8

---

### Step 10: 未検証ドメインからの送信をブロックするガードをメール送信パスに追加

**概要:** 組織メールドメイン (`OrganisationEmail`) を使用して送信する際、対応する `EmailDomain.status` が `VERIFIED` でない場合は送信を拒否するガードをメール送信パスに追加する。

**変更対象ファイル:**
- `packages/email/mailer.ts` またはメールジョブハンドラ (`send.signup.confirmation.email` 等のジョブ処理箇所)

**追加テスト:**
- `packages/email/mailer-guard.test.ts` 新規。未検証ドメイン (`PENDING`) 宛ての送信が拒否され、検証済みドメイン (`VERIFIED`) 宛ては許可されることをモックで検証。

**受入基準:**
- `EmailDomain.status !== VERIFIED` のドメインからの送信 → エラー。
- `VERIFIED` ドメイン → 通常送信。

**依存関係:** Step 9

---

### Step 11: CI 用の本番環境変数検証スクリプトを追加

**概要:** `.env.example` の `NEXT_PRIVATE_SMTP_*` / `NEXT_PRIVATE_MAILCHANNELS_*` / `NEXT_PRIVATE_RESEND_*` など、本番で必須の環境変数が不足している場合に CI を失敗させるスクリプトを追加する。

**変更対象ファイル:**
- `scripts/verify-prod-env.mjs` 新規作成
- `.github/workflows/translations-check.yml` または新規ワークフローにスクリプト実行ステップを追加

**追加テスト:**
- `scripts/verify-prod-env.mjs` 自体の実行テスト (不足変数あり/なしで終了コードが変わることを確認)

**受入基準:**
- 本番必須の環境変数が全て設定されている → 終了コード 0。
- 1 つでも不足 → 終了コード非ゼロ + 不足変数名を出力。

**依存関係:** Step 7

---

### Step 12: トランスポート選択・本番ガードの回帰テスト統合

**概要:** Steps 7-11 で追加したメール送信関連の変更について、既存の email ジョブ (`send.signup.confirmation.email` 等) と組み合わせた回帰テストを整備する。

**変更対象ファイル:**
- `packages/email/mailer.test.ts` (拡充)
- 既存の email 関連テストファイルがある場合はそこへ追加

**追加テスト:**
- ジョブキュー経由のメール送信が、トランスポート種別ごとに正しく動作すること。
- 本番ガードにより不正構成時にジョブが失敗すること。

**受入基準:**
- `npx biome check packages/email/**/*.test.ts` が合格。
- CI 上で email 関連テストが緑。

**依存関係:** Steps 7-11

---

## Phase 3: 署名リンクのステップアップ認証 (Steps 13-18)

### Step 13: 組織設定に「署名時の追加認証必須化」フラグを追加

**概要:** 組織ごとに「署名完了前に追加認証 (2FA/Passkey/ワンタイムコード) を必須化するか」のフラグを設定できるようにする。既存の組織設定テーブル (`OrganisationGlobalSettings` 等) にカラムを追加するか、新規テーブルを作成する。

**変更対象ファイル:**
- `packages/prisma/schema.prisma` (設定モデルに `requireStepUpAuthForSigning: Boolean @default(false)` 追加)
- 対応するマイグレーションファイル新規作成

**追加テスト:**
- なし (スキーマ変更)

**受入基準:**
- マイグレーションが正常に生成・適用できる。
- デフォルト値が `false` (既存組織に影響しない)。

**依存関係:** なし

---

### Step 14: 署名トークン検証時にステップアップ認証要否を判定するロジックを実装

**概要:** `/sign/${recipient.token}` へのアクセス時、組織設定のフラグに基づきステップアップ認証が必要かを判定するミドルウェアまたはヘルパーを実装する。

**変更対象ファイル:**
- `packages/lib/server-only/document/get-document-by-token.ts` または署名ルートハンドラ (`apps/remix/app/routes/_authenticated+/...` の签名関連ルート)

**追加テスト:**
- `packages/lib/server-only/document/step-up-auth.test.ts` 新規。フラグ有り/無しで判定結果が正しく変わることを検証。

**受入基準:**
- フラグ `false` → ステップアップ不要 (現行動作)。
- フラグ `true` → ステップアップ必要を返す。

**依存関係:** Step 13

---

### Step 15: 署名直前のワンタイムコード再送 or Passkey 再認証フローを実装

**概要:** ステップアップ認証が必要な場合、署名ボタンクリック前に受信者メールにワンタイムコードを再送するか、ログイン済みユーザーには Passkey 再認証を挟むフローを実装する。

**変更対象ファイル:**
- `packages/lib/server-only/user/send-confirmation-token.ts` (流用) または新規 `send-step-up-code.ts`
- 署名フロントエンド (React コンポーネント)

**追加テスト:**
- `packages/lib/server-only/user/send-step-up-code.test.ts` 新規。コード生成・メールジョブ発行をモックで検証。

**受入基準:**
- ステップアップ必要時、署名完了前に認証コード入力 UI が表示される。
- 正しいコード入力で署名が完了する。

**依存関係:** Step 14

---

### Step 16: 署名完了時のステップアップ認証履歴を監査ログに記録

**概要:** 署名完了時に、ステップアップ認証が実施されたか否か、および認証方式 (2FA/Passkey/コード) を `DocumentAuditLog` に記録する。

**変更対象ファイル:**
- `packages/lib/server-only/document/` の署名完了処理箇所
- `packages/prisma/migrations/` の監査ログテーブルに `stepUpAuthMethod` カラム追加 (必要に応じて)

**追加テスト:**
- 監査ログレコードに `stepUpAuthMethod` が記録されることを検証するテスト。

**受入基準:**
- 署名完了時の監査ログにステップアップ認証履歴が含まれる。
- 電帳法「真実性」チェックリスト項目 (`system-hash-chain`) と整合する。

**依存関係:** Step 15

---

### Step 17: 署名設定 UI スイッチをコンプライアンス設定画面に追加

**概要:** `settings.compliance.tsx` に「署名時の追加認証を必須化」のトグルスイッチを追加し、組織設定を保存する。

**変更対象ファイル:**
- `apps/remix/app/routes/_authenticated+/t.$teamUrl+/settings.compliance.tsx`

**追加テスト:**
- なし (UI 変更。E2E で表示確認)

**受入基準:**
- トグルスイッチが表示され、ON/OFF 切替で組織設定が保存される。
- 保存後、画面に反映される。

**依存関係:** Step 13

---

### Step 18: 署名ステップアップ認証の E2E テストを追加

**概要:** `jp-core-signing-flow.spec.ts` に、ステップアップ認証有効時の署名フロー (認証コード入力 → 署名完了) を E2E テストとして追加する。

**変更対象ファイル:**
- `packages/app-tests/e2e/jp-core-signing-flow.spec.ts`

**追加テスト:**
- `test('should require step-up authentication before signing when enabled')` 新規。
- 組織設定でステップアップ必須化を有効にし、署名前に認証コード入力が必要で、正しく署名完了することを検証。

**受入基準:**
- E2E テストが CI 上で緑。
- 認証コード未入力では署名ボタンが押せない (またはエラーになる)。

**依存関係:** Steps 13-17

---

## Phase 4: 電帳法検証可視化・回帰テスト統合 (Steps 19-24)

### Step 19: 監査ログハッシュチェーン検証エンドポイントを実装

**概要:** 監査ログの SHA-256 ハッシュチェーン整合性を検証する API エンドポイントを実装する。`DocumentAuditLog` の直前ハッシュと連鎖を検証し、改ざんを検知する。

**変更対象ファイル:**
- `apps/remix/app/routes/_authenticated+/t.$teamUrl+/` または API ルートに `audit-log-verify` エンドポイント新規作成

**追加テスト:**
- `packages/lib/server-only/audit-log/verify-chain.test.ts` 新規。正常チェーンと改ざん済みチェーンで結果が正しく分かれることを検証。

**受入基準:**
- 正常チェーン → `valid: true`。
- 任意のログ改ざん → `valid: false` かつ該当ログ ID を特定。

**依存関係:** なし (既存の WORM トリガー・ハッシュチェーンを利用)

---

### Step 20: 締結証明書 PDF にハッシュチェーン検証結果欄を追加

**概要:** 締結証明書 PDF に「SHA-256 ハッシュチェーン検証結果」と「改ざん検知ステータス」を目視できる欄として追加する。

**変更対象ファイル:**
- 締結証明書生成コード (`packages/signing/` または `packages/lib/server-only/document/` の PDF 生成箇所)

**追加テスト:**
- PDF 生成結果に検証結果欄が含まれることを文字列検証するテスト。

**受入基準:**
- 締結証明書 PDF に「ハッシュチェーン検証: 正常」または「改ざん検知」の記載がある。
- 電帳法施行規則第3条・第4条相当の真実性担保が文書上で確認できる。

**依存関係:** Step 19

---

### Step 21: 設定画面に「監査ログ検証」ボタンを追加

**概要:** `settings.compliance.tsx` のコンプライアンスチェックリストに、「監査ログハッシュチェーン検証」ボタンを追加し、即座に整合性チェックを実行・表示する。

**変更対象ファイル:**
- `apps/remix/app/routes/_authenticated+/t.$teamUrl+/settings.compliance.tsx`

**追加テスト:**
- なし (UI 変更。E2E でボタン押下後の検証結果表示を確認)

**受入基準:**
- ボタン押下後、検証結果 (正常/異常) が画面に表示される。
- 異常時は該当ログ ID が表示される。

**依存関係:** Step 19

---

### Step 22: WORM トリガーの回帰テストを追加

**概要:** `packages/prisma/migrations/20261016000001_add_audit_log_worm_trigger/migration.sql` で作成した WORM トリガー (UPDATE/DELETE 拒否) が正常に機能することを DB テストで検証する。

**変更対象ファイル:**
- `packages/prisma/migrations/20261016000001_add_audit_log_worm_trigger/migration.sql` (テスト用コメント追加など)
- テストスクリプト新規作成 (`scripts/test-worm-trigger.mjs` または既存テストスイート)

**追加テスト:**
- `DocumentAuditLog` に対する UPDATE が例外を投げること。
- `DocumentAuditLog` に対する DELETE が例外を投げること。
- INSERT は正常に成功すること。

**受入基準:**
- テストスクリプト実行時に UPDATE/DELETE が `RAISE EXCEPTION` を投げることを確認。
- INSERT が成功することを確認。

**依存関係:** なし

---

### Step 23: email 回帰テスト統合 (サインアップ/検証/パスワードリセット)

**概要:** メール認証周りの既存フロー (サインアップ確認メール、メール確認、パスワードリセット) が Phase 1-3 の変更で壊れていないことを回帰テストする。

**変更対象ファイル:**
- `packages/lib/server-only/user/verify-email.test.ts` (存在する場合は拡充、なければ新規)
- `packages/app-tests/e2e/jp-core-signing-flow.spec.ts` (既存シナリオの再実行確認)

**追加テスト:**
- `verify-email` トークン有効/期限切れ/未検出の 3 パターン。
- サインアップ → 確認メール発行 → メール確認 → サインイン可能 のフルフロー。
- パスワードリセットフロー。

**受入基準:**
- 既存の email 回帰テストがすべて CI で緑。
- Phase 1-3 の変更により既存フローが破綻していない。

**依存関係:** Steps 1-22

---

### Step 24: 全ステップの lint / typecheck / 翻訳更新・最終レビュー

**概要:** すべての変更ファイルに Biome lint を適用し、`tsc --noEmit` で型チェックを実行する。新規 UI 文字列を日本語翻訳ファイル (`packages/lib/translations/ja/web.po`) に追加し、最終レビューを行う。

**変更対象ファイル:**
- 全変更ファイル (Biome 形式整合)
- `packages/lib/translations/ja/web.po` (新規文字列の ja 翻訳追加)

**追加テスト:**
- `npm run lint` (変更ファイル対象) が合格。
- `npx tsc --noEmit -p apps/remix/tsconfig.json` が 0 エラー。
- 翻訳チェック (`.github/workflows/translations-check.yml`) が合格。

**受入基準:**
- Biome lint: 変更ファイルにフォーマットエラーなし。
- 型チェック: 0 エラー。
- 翻訳: 新規文字列すべてに ja 訳が存在する。
- すべてのステップのテストが CI で緑。

**依存関係:** Steps 1-23

---

## 回帰防止テストの概要表

| ステップ | テスト種別 | テストファイル | 検証項目 |
|---------|-----------|--------------|---------|
| 1 | ユニット | `packages/lib/utils/email-domains.test.ts` | DMARC レコード生成 |
| 2 | ユニット | `packages/lib/utils/email-domains.test.ts` | 3 レコード生成 (DKIM/SPF/DMARC) |
| 3 | ユニット | `packages/ee/server-only/lib/create-email-domain.test.ts` | DMARC レコード含有 |
| 6 | ユニット統合 | `packages/lib/utils/email-domains.test.ts` | レコード重複なし・引数不正 |
| 7 | ユニット | `packages/email/mailer.test.ts` | 本番ガード (smtp-auth 未認証拒否) |
| 9 | ユニット | `packages/ee/server-only/lib/verify-email-domain.test.ts` | status 遷移 (PENDING→VERIFIED) |
| 10 | ユニット | `packages/email/mailer-guard.test.ts` | 未検証ドメイン送信拒否 |
| 11 | スクリプト | `scripts/verify-prod-env.mjs` | 必須環境変数チェック |
| 12 | ユニット統合 | `packages/email/mailer.test.ts` | ジョブ経由送信のトランスポート別動作 |
| 14 | ユニット | `packages/lib/server-only/document/step-up-auth.test.ts` | ステップアップ要否判定 |
| 15 | ユニット | `packages/lib/server-only/user/send-step-up-code.test.ts` | ワンタイムコード発行 |
| 18 | E2E | `packages/app-tests/e2e/jp-core-signing-flow.spec.ts` | ステップアップ署名フロー |
| 19 | ユニット | `packages/lib/server-only/audit-log/verify-chain.test.ts` | ハッシュチェーン整合性 |
| 22 | DB | `scripts/test-worm-trigger.mjs` | WORM トリガー (UPDATE/DELETE 拒否) |
| 23 | 回帰/E2E | `verify-email.test.ts`, `jp-core-signing-flow.spec.ts` | email フロー全体 |
| 24 | 静的解析/型チェック/翻訳 | `npm run lint`, `tsc --noEmit`, 翻訳チェック | コード品質・型安全・多言語対応 |

---

## 実行順序と並列化

- Steps 1-6 (Phase 1) は順次実行 (各ステップが前ステップの出力に依存)。
- Steps 7-12 (Phase 2) は順次実行。Step 11 の CI スクリプトは Step 7 完了後すぐに追加可能。
- Steps 13-18 (Phase 3) は順次実行。
- Steps 19-24 (Phase 4) は順次実行。Step 22 の WORM テストは既存 migration なのでいつでも実行可能。
- Step 24 は全ステップ完了後に実行。

**推奨スケジュール:** 1 ステップあたり半日〜1日。全体で約 2〜3 週間。

---

## リスクと回避策

| リスク | 回避策 |
|--------|--------|
| DMARC `p=reject` により正当なメールが届かない | 初期は `p=none` で運用し、DKIM/SPF が安定してから `p=reject` に移行する段階的アプローチを検討 |
| 本番ガードにより開発環境でメール送信不可 | `NODE_ENV` で分岐し、開発環境 (`localhost`) は従来通り動作 |
| ステップアップ認証による UX 劣化 | 組織設定でオプトイン方式にし、デフォルトは現行動作 (メールリンクのみ) |
| WORM トリガーによる正当なメンテナンス UPDATE が不可 | 管理者専用の一時的無効化手段 or 別テーブルへの退避フローを別途検討 |
