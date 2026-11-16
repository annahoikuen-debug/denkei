# デンケイ (Denkei) コードレビュー指摘事項・詳細実装計画書
(Code Review Remediation & Implementation Plan)

- **作成日**: 2026-11-16
- **ステータス**: 計画承認待ち (Draft / Pending Approval)
- **対象リポジトリ**: `E:\Denkei\denkei`
- **対象環境**: Node.js 24 / React Router 7 (Remix) / Prisma (PostgreSQL) / Vitest

---

## 1. 概要と目的

2026年11月16日に実施した包括的コードレビューに基づき、検出された不具合、セキュリティリスク、未接続機能、および業務適合性（電帳法・インボイス制度・契約業務）の課題を確実に解消するための詳細実装計画書です。

本計画書は、**「システムの安定稼働・データ保護（P0）」→「データ整合性・セキュリティ堅牢化（P1）」→「ウィザード UX・機能接続（P1〜P2）」→「業務適合性・長期保守性（P2）」** の 4 フェーズ・12 タスクに分割し、各タスクに具体的な修正内容、対象ファイル、テスト仕様、検証コマンド、およびロールバック手順を定義します。

---

## 2. タスク一覧サマリ

| Phase | Task ID | 優先度 | 項目名 | 対象領域 |
|:---:|:---:|:---:|:---|:---|
| **Phase 1** | **TASK-01** | **P0 (Critical)** | WORM トリガーと外部キー制約（SetNull）衝突による文書削除エラーの解消 | DB / Migration / Prisma |
| **Phase 1** | **TASK-02** | **P0 (High)** | 適格請求書 HTML 生成における XSS 脆弱性の修正 | Security / Invoice |
| **Phase 1** | **TASK-03** | **P0 (High)** | 3ステップウィザードにおける「戻る」再送信時の受取人重複ブロック修正 | Remix / Wizard / trpc |
| **Phase 2** | **TASK-04** | **P1 (Medium)** | 電帳法 CSV エクスポートの数式インジェクション（CSV Injection）対策 | Security / 電帳法 CSV |
| **Phase 2** | **TASK-05** | **P1 (Medium)** | 起動時環境変数バリデーションにおける `DATABASE_URL` フォールバック対応 | Server / Deployment |
| **Phase 2** | **TASK-06** | **P1 (Medium)** | メール OTP 検証におけるタイミング攻撃耐性向上 (`timingSafeEqual`) | Security / OTP |
| **Phase 3** | **TASK-07** | **P1 (Medium)** | ウィザード送信画面での有効期限・リマインダー設定のバックエンド保存接続 | UI / Workflow / Jobs |
| **Phase 3** | **TASK-08** | **P1 (Medium)** | ウィザード「詳細モードで編集」のリンク先をエディタ画面へ修正 | UI / Navigation |
| **Phase 3** | **TASK-09** | **P2 (Medium)** | 署名順（先方/自社）および自社署名者自動追加フローの実装 | Wizard / Signing Flow |
| **Phase 3** | **TASK-10** | **P2 (Low)** | ウィザード UI のプラン名動的表示と署名欄初期配置の最適化 | UI / Japanese UX |
| **Phase 4** | **TASK-11** | **P2 (Low)** | 和暦（`toWareki`）ユーティリティの平成・昭和対応拡張 | Localization / Wareki |
| **Phase 4** | **TASK-12** | **P2 (Low)** | 監査ログハッシュチェーンの並行書き込み排他制御（フォーク防止） | Audit Log / Database |

---

## 3. Phase 1: クリティカルセキュリティ＆本番障害防止 (P0)

### TASK-01: WORM トリガーと外部キー制約（SetNull）衝突による文書削除エラーの解消

#### 課題と背景
- **発生事象**: `packages/lib/server-only/document/delete-document.ts` で非完了文書を削除（`tx.envelope.delete`）すると、`schema.prisma` の `onDelete: SetNull` により `DocumentAuditLog.envelopeId` を `NULL` に更新しようとする。しかし、`20261016000001_add_audit_log_worm_trigger` のトリガー `prevent_audit_log_mutation()` が UPDATE を全面遮断しているため、`RAISE EXCEPTION` が発生し、削除操作が 100% 失敗する。
- **影響度**: ドキュメント削除機能が本番で機能不全となる。

#### 修正方針
1. 新規マイグレーションを作成し、PostgreSQL トリガー関数 `prevent_audit_log_mutation()` を更新する。
2. 「`envelopeId` が外部キー制約により `NULL` に変更され、かつ他のカラム（`id`, `createdAt`, `type`, `data`, `prevHash`, `hash` 等）が一切変更されていない UPDATE」のみ例外的に許可する。
3. 監査ログデータの改ざん・削除は引き続き厳密に遮断する。

#### 対象ファイル
- `packages/prisma/migrations/20261116000000_fix_audit_log_worm_fk_set_null/migration.sql` (新規)
- `packages/lib/server-only/document/delete-document.test.ts` (新規または既存テスト拡充)

#### 実装コード詳細
```sql
-- packages/prisma/migrations/20261116000000_fix_audit_log_worm_fk_set_null/migration.sql
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    -- 外部キー制約 (onDelete: SetNull) による envelopeId の NULL 化のみ許可
    -- 監査ログ本文 (data, hash, type, createdAt 等) の改ざんは一切許容しない
    IF (TG_OP = 'UPDATE'
        AND OLD.envelopeId IS NOT NULL 
        AND NEW.envelopeId IS NULL
        AND OLD.id = NEW.id
        AND OLD.createdAt = NEW.createdAt
        AND OLD.type = NEW.type
        AND OLD.data = NEW.data
        AND COALESCE(OLD.prevHash, '') = COALESCE(NEW.prevHash, '')
        AND COALESCE(OLD.hash, '') = COALESCE(NEW.hash, '')) THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'DocumentAuditLog records are append-only (WORM) and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;
```

#### テスト・受入基準
- 監査ログが存在する非完了エンベロープに対して `deleteDocument` を実行した際、例外が発生せず削除が完了すること。
- 直接 SQL 等で `DocumentAuditLog` の `data` や `hash` を UPDATE しようとした場合は依然として `RAISE EXCEPTION` で拒絶されること。

---

### TASK-02: 適格請求書 HTML 生成における XSS 脆弱性の修正

#### 課題と背景
- **発生事象**: `packages/lib/universal/qualified-invoice.ts` 内の `generateQualifiedInvoiceHtml` において、`props.customerName`, `props.itemName`, `props.invoiceId`, `props.billingPeriod`, `issuerName`, `issuerAddress` がエスケープされずに HTML 文字列に直接埋め込まれている。
- **影響度**: 顧客名や品目名にスクリプトタグが含まれている場合、ブラウザ表示時や PDF 生成レンダラーで任意の JavaScript が実行される危険がある（High）。

#### 修正方針
1. `qualified-invoice.ts` 内に堅牢な HTML エスケープ関数 `escapeHtml` を定義する。
2. 文字列補間を行うすべてのパラメータを `escapeHtml` 経由で出力する。
3. 数値フォーマット（`amountJpy`, `tax`）は既に数値保証されているためそのまま出力。

#### 対象ファイル
- `packages/lib/universal/qualified-invoice.ts`
- `packages/lib/universal/qualified-invoice.test.ts`

#### 実装コード詳細
```ts
// packages/lib/universal/qualified-invoice.ts
export const escapeHtml = (str: string | null | undefined): string => {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (m) => {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return m;
    }
  });
};

// HTML 生成部
// ${escapeHtml(props.customerName)}
// ${escapeHtml(props.itemName)}
// ${escapeHtml(props.invoiceId)}
// ${escapeHtml(props.billingPeriod)}
// ${escapeHtml(issuerName)}
// ${escapeHtml(issuerAddress)}
```

#### テスト・受入基準
- `qualified-invoice.test.ts` にテストを追加し、`<script>alert(1)</script>` や `" onmouseover="...` が安全に `&lt;script&gt;` / `&quot;` に置換されていることを確認。

---

### TASK-03: 3ステップウィザードにおける「戻る」再送信時の受取人重複ブロック修正

#### 課題と背景
- **発生事象**: `apps/remix/app/routes/_authenticated+/t.$teamUrl+/new+/recipients.tsx` で一度ステップ3に進んだ後、ブラウザバックや「戻る」ボタンでステップ2に戻り、再度「次へ」を押すと、DB 側に同一受取人が存在するため `EMAIL_ADDRESS_ALREADY_IN_USE` エラーとなり、画面が停止して進めなくなる。
- **影響度**: ユーザーの入力修正を阻害し、ウィザードの離脱原因となる重大な UX 不具合。

#### 修正方針
1. 受取人作成前に、既存のエンベロープ受取人一覧を取得する。
2. 既に受取人が登録されている場合は、新規作成ではなく既存レコードの更新（`envelope.recipient.update`）を行うか、あるいは不要な未署名受取人を一度クリアして再作成する。
3. 初回送信時と再送信時の両方でシームレスにステップ3へ進めるようにする。

#### 対象ファイル
- `apps/remix/app/routes/_authenticated+/t.$teamUrl+/new+/recipients.tsx`

#### テスト・受入基準
- ステップ1（PDFアップロード）→ ステップ2（宛先入力）→ ステップ3（フィールド配置）と進んだ後、ステップ2へ戻って氏名やメールアドレスを修正し、再度「次へ」を押した際にエラーにならず正常にステップ3へ遷移できること。

---

## 4. Phase 2: データ整合性・セキュリティ堅牢化 (P1)

### TASK-04: 電帳法 CSV エクスポートの数式インジェクション（CSV Injection）対策

#### 課題と背景
- **発生事象**: `packages/lib/universal/electronic-ledger-csv.ts` の `escapeCsvField` はカンマやダブルクォートのクォート処理を行っているが、先頭文字が `=`, `+`, `-`, `@` の場合の数式無害化を行っていない。
- **影響度**: 電帳法台帳 CSV を Excel で開いた際、意図しない外部コマンド実行や DDE 攻撃のリスクが生じる。

#### 修正方針
- 文字列の先頭が `=`, `+`, `-`, `@`, `\t`, `\r` の場合、先頭に単一引用符 `'` を付加して文字列として強制認識させる。
- 負の数値文字列（金額など）を過剰に壊さないよう、数値判定との整合性に配慮する。

#### 対象ファイル
- `packages/lib/universal/electronic-ledger-csv.ts`
- `packages/lib/universal/electronic-ledger-csv.test.ts`

---

### TASK-05: 起動時環境変数バリデーションにおける `DATABASE_URL` フォールバック対応

#### 課題と背景
- **発生事象**: `apps/remix/server/utils/validate-env.ts` で `NEXT_PRIVATE_DATABASE_URL` をハードコードで必須化しているが、Railway や Vercel 等のデプロイ環境では `DATABASE_URL` や `POSTGRES_URL` のみ注入されるケースがある。`packages/prisma/helper.ts` ではフォールバック代入が実装されているが、`validateRequiredEnv` が先に実行されるとプロセスが不当にクラッシュする。

#### 修正方針
- `validateRequiredEnv` 内で、データベース接続 URL については `NEXT_PRIVATE_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL` のいずれかが設定されていれば合格とする。

#### 対象ファイル
- `apps/remix/server/utils/validate-env.ts`
- `apps/remix/server/utils/validate-env.test.ts`

---

### TASK-06: メール OTP 検証におけるタイミング攻撃耐性向上

#### 課題と背景
- **発生事象**: `packages/lib/server-only/otp/otp.ts` の `verifyOtp` で `hashOtp(input.inputOtp) !== input.storedHash` と文字列直接比較している。

#### 修正方針
- `node:crypto` の `timingSafeEqual` を使用し、長さチェックを行った上で固定時間比較を実施する。

#### 対象ファイル
- `packages/lib/server-only/otp/otp.ts`
- `packages/lib/server-only/otp/otp.test.ts`

---

## 5. Phase 3: ウィザード UX および機能接続の完成 (P1〜P2)

### TASK-07: ウィザード送信画面での有効期限・リマインダー設定のバックエンド保存接続

#### 課題と背景
- **発生事象**: `apps/remix/app/routes/_authenticated+/t.$teamUrl+/new+/fields.tsx` に有効期限（7日/14日/30日/無期限）やリマインダー間隔・回数の UI が存在するが、送信時の `distributeEnvelope` にパラメータが渡されていない。
- **修正方針**:
  1. `distributeEnvelope`（または `envelope.update`）の呼び出し時に `automationSettings` またはメタデータとして設定値を送信する。
  2. 自動リマインダー・失効ジョブ（BullMQ / Inngest）がこの設定を参照して正しく動作するように結線する。
- **対象ファイル**: `apps/remix/app/routes/_authenticated+/t.$teamUrl+/new+/fields.tsx`

---

### TASK-08: ウィザード「詳細モードで編集」のリンク先をエディタ画面へ修正

#### 課題と背景
- **発生事象**: `fields.tsx` の「詳細モードで編集」ボタンのリンク先が `/t/${team.url}/documents`（一覧画面）になっている。
- **修正方針**:
  - `/t/${team.url}/documents/${envelopeId}/edit` 等の正規のエディタ URL を生成してリンクさせる。
- **対象ファイル**: `apps/remix/app/routes/_authenticated+/t.$teamUrl+/new+/fields.tsx`

---

### TASK-09: 署名順（先方/自社）および自社署名者自動追加フローの実装

#### 課題と背景
- **発生事象**: `recipients.tsx` で署名順ラジオボタン（先方→自社 / 自社→先方 / 同時）を選択可能だが、コード上で使用されておらず、先方受取人のみ `signingOrder: 1` で作成されている。
- **修正方針**:
  1. 「自社 → 先方」の場合は送信者を `signingOrder: 1`、先方を `signingOrder: 2` として登録。
  2. 「先方 → 自社」の場合は先方を `signingOrder: 1`、送信者を `signingOrder: 2` として登録。
  3. 「同時に署名」の場合は両方を `signingOrder: 1` として登録。
- **対象ファイル**: `apps/remix/app/routes/_authenticated+/t.$teamUrl+/new+/recipients.tsx`

---

### TASK-10: ウィザード UI のプラン名動的表示と署名欄初期配置の最適化

#### 課題と背景
- **修正方針**:
  1. `apps/remix/app/routes/_authenticated+/t.$teamUrl+/new+/_index.tsx` のバッジで `Standard` とハードコードされている箇所を、`useLimits()` やチームプラン情報から動的に表示。
  2. 署名欄・日付欄の自動配置（`fields.tsx`）において、契約書の総ページ数（`envelopeItems[0].pages` 等）を取得し、最終ページの末尾に配置するよう初期座標を最適化する。
- **対象ファイル**:
  - `apps/remix/app/routes/_authenticated+/t.$teamUrl+/new+/_index.tsx`
  - `apps/remix/app/routes/_authenticated+/t.$teamUrl+/new+/fields.tsx`

---

## 6. Phase 4: 中長期・法対応/業務適合性向上 (P2)

### TASK-11: 和暦（`toWareki`）ユーティリティの平成・昭和対応拡張
- **修正方針**: `packages/lib/universal/wareki-date.ts` で `WAREKI_ERA_START = '2019-05-01'` による令和限定制限を撤廃し、`Intl.DateTimeFormat('ja-JP-u-ca-japanese')` がサポートする明治以降の元号を正しくフォーマットできるよう拡張する。
- **対象ファイル**: `packages/lib/universal/wareki-date.ts`, `packages/lib/universal/wareki-date.test.ts`

### TASK-12: 監査ログハッシュチェーンの並行書き込み排他制御（フォーク防止）
- **修正方針**: `packages/lib/server-only/document/create-document-audit-log.ts` において、同一 `envelopeId` に対する同時書き込みによるチェーン分岐を防ぐため、トランザクション内でのエンベロープ行ロック（`SELECT ... FOR UPDATE`）または楽観的ロックを導入する。
- **対象ファイル**: `packages/lib/server-only/document/create-document-audit-log.ts`

---

## 7. 検証・品質保証計画 (Verification Strategy)

各タスク完了時に以下の検証スイートを実行し、リグレッションが発生していないことを確認します。

```bash
# 1. ライブラリ単体テスト (Vitest 560+ tests)
cd packages/lib && npm test

# 2. Remix サーバー・ユーティリティテスト
cd apps/remix && npx vitest run server/utils/validate-env.test.ts

# 3. TypeScript 型チェック (0 errors を担保)
npm run prisma:generate
cd apps/remix && npx react-router typegen
npx tsc --noEmit -p tsconfig.json

# 4. Biome 静的解析 (変更ファイルのみ)
npx biome check <変更ファイルパス>
```

---

## 8. ロールバック方針

各タスクは独立したコミットとして適用し、問題が発生した場合は以下の手順で即時切り戻しを行います。
- **DB マイグレーション (TASK-01)**: `DROP FUNCTION prevent_audit_log_mutation()` および元のトリガー再適用 SQL を用意しロールバック。
- **UI / ロジック変更 (TASK-02〜TASK-10)**: Git revert により該当コミットのみを安全に取り消し。
