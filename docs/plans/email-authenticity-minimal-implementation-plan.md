# メール真正性改善・最小実装計画書（個人開発・ほぼ自動化版）

> **ステータス**: **不採用・アーカイブ（REJECTED / ARCHIVED）** (2026-10-16)  
> **理由**: 課題（署名者の本人性確認）と処方箋（独自ドメインのDMARC/SES設定）の乖離、および主要機能（SES同期）の既存重複のため。署名者の真正性・電帳法要件は「SMB割り切り戦略（Stage A〜E: メールOTP・WORMトリガー・ハッシュチェーン・電帳法規程キット）」にて実装完了済み。

## 概要

個人開発・小規模運用を想定した「メールのみの真正性」改善計画。  
24ステップの大規模計画ではなく、**最小構成（Phase 1〜2）＋ SES 検証ステータス自動ポーリング** に絞り、運用コストを月 30 分以下に抑える。

対象スコープ:
1. **DMARC レコード生成・DNS 表示** (`p=none` デフォルト、段階的導入)
2. **本番ガード**（SMTP 認証必須化、開発デフォルトの無認証 SMTP を本番で許容しない）
3. **SES 検証ステータス自動ポーリング**（PENDING→VERIFIED の自動遷移、失敗通知）

**自動化できる範囲:** レコード生成、本番ガード、SES 検証ポーリング、失敗通知  
**自動化できない範囲:** DNS レコードの実際の登録（ドメイン管理画面での手動 TXT 登録が必要、ドメイン追加時に 1 回のみ）

既存の WORM トリガー・ハッシュチェーンは実装済みのため活用。ステップアップ認証や監査ログ可視化 UI は後回し。

関連既存ファイル:
- `packages/lib/utils/email-domains.ts` — DKIM/SPF レコード生成
- `packages/ee/server-only/lib/create-email-domain.ts` — SES ドメイン作成
- `packages/email/mailer.ts` — SMTP トランスポート生成
- `apps/remix/app/components/dialogs/organisation-email-domain-create-dialog.tsx` — ドメイン作成 UI
- `packages/prisma/migrations/20261016000001_add_audit_log_worm_trigger/migration.sql` — WORM トリガー（既存、活用）

前提:
- `npm run lint` (Biome) は変更ファイルのみ実行。Windows CRLF 環境差分は既知課題。
- 型チェックは `npx tsc --noEmit -p apps/remix/tsconfig.json`。
- Vitest は既知の環境起因失敗あり。CI(Linux)結果を基準とする。

---

## ステップ構成（計 6 ステップ）

| ステップ | 内容 | 工数目安 |
|---------|------|----------|
| 1 | `generateDmarcRecord` / `generateEmailDomainRecords` に DMARC 追加 | 0.5日 |
| 2 | `create-email-domain.ts` で DMARC レコードを返却 | 0.5日 |
| 3 | DNS レコード表示 UI に DMARC 行を追加 | 0.5日 |
| 4 | `mailer.ts` 本番ガード（`smtp-auth` 未認証拒否） | 0.5日 |
| 5 | SES 検証ステータス自動ポーリング + 失敗通知 | 1.0日 |
| 6 | テスト整備・CI 統合・最終レビュー | 1.0日 |

**合計: 約 4 日**

---

### Step 1: `generateDmarcRecord` 関数追加と `generateEmailDomainRecords` への統合

**概要:** `packages/lib/utils/email-domains.ts` に DMARC DNS TXT レコード生成関数を追加し、`generateEmailDomainRecords` の戻り値に DKIM + SPF + DMARC の 3 種類を含める。DMARC ポリシーは `p=none` から開始（監視のみ、誤配信防止）。

**変更対象ファイル:**
- `packages/lib/utils/email-domains.ts`

**追加テスト:**
- `packages/lib/utils/email-domains.test.ts` 新規作成
  - `generateDmarcRecord('none')` が `v=DMARC1; p=none; ...` を返すこと
  - `generateEmailDomainRecords` が 3 件のレコード（DKIM/SPF/DMARC）を返すこと

**受入基準:**
- DMARC レコードの `name` は `_dmarc`、`type` は `TXT`
- デフォルトポリシーが `none`（`reject` ではない）

**依存関係:** なし

---

### Step 2: `create-email-domain.ts` で DMARC レコードを返却

**概要:** SES ドメイン作成時に、生成した DMARC レコードを戻り値の `records` に含める。ユーザーは DNS に 3 種類すべてを登録する。

**変更対象ファイル:**
- `packages/ee/server-only/lib/create-email-domain.ts`

**追加テスト:**
- `packages/ee/server-only/lib/create-email-domain.test.ts` 新規作成（モック SES クライアント使用）
  - `records` に `type === 'TXT' && name === '_dmarc'` のレコードが含まれること

**受入基準:**
- `createEmailDomain` の戻り値 `records` に DMARC レコードが含まれる
- DMARC 値に `p=none` が含まれる

**依存関係:** Step 1

---

### Step 3: DNS レコード表示 UI に DMARC 行を追加

**概要:** カスタムメールドメイン作成時の DNS レコード表示ダイアログに DMARC 行を追加し、コピーボタンを付与する。

**変更対象ファイル:**
- `apps/remix/app/components/dialogs/organisation-email-domain-create-dialog.tsx`

**追加テスト:** なし（UI 変更のみ。E2E で表示確認）

**受入基準:**
- DKIM / SPF / DMARC の 3 行が表示される
- 各行に「コピー」ボタンがある

**依存関係:** Step 2

---

### Step 4: `mailer.ts` 本番ガード（SMTP 認証必須化）

**概要:** `packages/email/mailer.ts` の `getTransport` で、`NODE_ENV === 'production'` かつトランスポートが `smtp-auth` で認証情報未設定の場合、起動時にエラーを投げる。開発環境では従来通り動作。

**変更対象ファイル:**
- `packages/email/mailer.ts`

**追加テスト:**
- `packages/email/mailer.test.ts` 新規作成
  - `NODE_ENV='production'` かつ `smtp-auth` 未認証時に `getTransport()` がエラーを投げること
  - 開発環境または認証情報設定済みは正常にトランスポート生成されること

**受入基準:**
- 本番 + `smtp-auth` + 認証情報未設定 → `Error` スロー
- それ以外 → 正常生成

**依存関係:** なし

---

### Step 5: SES 検証ステータス自動ポーリング + 失敗通知

**概要:** `EmailDomain` の `status` を定期的に SES API でチェックし、DKIM/SPF/DMARC がすべて検証完了なら `status = VERIFIED` に自動更新。失敗し続けたら通知。

**変更対象ファイル:**
- `scripts/verify-ses-domains.mjs` 新規作成（または `packages/lib/jobs/` 配下の新規ジョブ）
- `packages/ee/server-only/lib/create-email-domain.ts` または新規 `verify-ses-domain.ts`（SES 検証チェック関数）

**追加テスト:**
- `scripts/verify-ses-domains.test.mjs` 新規作成（モック SES クライアント使用）
  - 検証成功時は `status = VERIFIED` に更新されること
  - 検証失敗時は `PENDING` のまま、かつ通知対象となること

**受入基準:**
- SES 側で DKIM/SPF/DMARC すべて `Success` → `EmailDomain.status = VERIFIED` かつ `lastVerifiedAt` 更新
- 失敗し続け → 管理者に通知（コンソール出力 or メール）

**依存関係:** Step 2

---

### Step 6: テスト整備・CI 統合・最終レビュー

**概要:** すべての変更ファイルに Biome lint を適用し、`tsc --noEmit` で型チェックを実行。新規 UI 文字列を日本語翻訳ファイルに追加。既存フローの回帰確認。

**変更対象ファイル:**
- 全変更ファイル（Biome 形式整合）
- `packages/lib/translations/ja/web.po`（新規文字列の ja 翻訳追加）

**追加テスト:**
- `packages/lib/utils/email-domains.test.ts`（Step 1 で作成済みの拡充）
- `packages/ee/server-only/lib/create-email-domain.test.ts`（Step 2 で作成済みの拡充）
- `packages/email/mailer.test.ts`（Step 4 で作成済みの拡充）
- 既存 E2E `packages/app-tests/e2e/jp-core-signing-flow.spec.ts` の再実行（回帰確認）

**受入基準:**
- `npx biome check <変更ファイル>` が合格
- `npx tsc --noEmit -p apps/remix/tsconfig.json` が 0 エラー
- 翻訳チェック (`.github/workflows/translations-check.yml`) が合格
- 既存 E2E フローが破綻していない

**依存関係:** Steps 1-5

---

## 運用フロー（自動化後）

1. ドメイン追加 → DKIM/SPF/DMARC レコードが自動生成・画面表示
2. 自分が DNS に TXT レコードを手動登録（Cloudflare/Route53 等、5 分）
3. SES が自動検証 → `status = VERIFIED` に自動遷移（Step 5 のポーリング）
4. それ以降は完全に放置で OK（メール送信可能）
5. 1〜2 年ごとに DKIM 鍵ローテーション（必要に応じて）

---

## 運用コスト（月あたり）

| 項目 | コスト |
|------|--------|
| DNS レコード登録 | ドメイン追加時に 5 分（1 回のみ） |
| SES 検証ステータス監視 | 自動（月 0 分、失敗時のみ通知） |
| DKIM 鍵ローテーション | 1〜2 年ごとに数時間 |
| 本番ガードによる開発トラブル | `.env` 設定必須化により、初期設定時のみ |

**目標: 月 30 分以下**

---

## 自動化できる範囲とできない範囲

| 項目 | 自動化 | 備考 |
|------|--------|------|
| DKIM/SPF/DMARC レコード文字列生成 | ✅ 自動 | `generateEmailDomainRecords` |
| 本番ガード（SMTP 認証必須） | ✅ 自動 | `mailer.ts` + CI env チェック |
| SES ドメイン作成 | ✅ 自動 | `create-email-domain.ts` |
| SES 検証ステータス自動遷移 | ✅ 自動 | Step 5 のポーリング |
| 失敗時通知 | ✅ 自動 | コンソール/メール通知 |
| DNS レコードの実際の登録 | ❌ 手動 | ドメイン管理画面での TXT 登録が必要 |
| DKIM 鍵ローテーション | ⚠️ 半自動 | 1〜2 年ごと、手動または別途実装 |

---

## リスクと回避策

| リスク | 回避策 |
|--------|--------|
| DMARC `p=none` はブロックしない | 最初は `none` で監視のみ。安定したら `quarantine` → `reject` と段階移行 |
| DNS 設定ミスでメールが届かない | DMARC `p=none` なら届かないことはない。SPF/DKIM のみで十分 |
| 本番ガードで開発環境が壊れる | `NODE_ENV=development` では従来通り `localhost:2500` を許可 |
| SES 検証が長時間 PENDING のまま | Step 5 で定期ポーリング + 失敗通知により早期発見 |

---

## 推奨スケジュール

1 ステップあたり半日〜1 日。全体で約 4 日。  
まず Step 1〜4（DMARC 追加・本番ガード）を完了させ、Step 5（自動ポーリング）を後から追加しても良い。
