# セキュリティ修正実装計画書 (Security Remediation Plan)

## 概要

Documenso（デンケイ）プロジェクトに対して実施したセキュリティテストで検出された 3 つの課題を修正するための実装計画書です。

- **S-01**: サイト設定バナーの保存型 XSS (`dangerouslySetInnerHTML` に未サニタイズのユーザー入力を直接描画)
- **S-02**: `.env.example` に弱いデフォルトシークレットが記載されている（展開時のリスク）
- **S-03**: `npm audit` で検出された依存関係の既知脆弱性 (High 17 / Moderate 7 / Low 2 / Critical 0)

リグレッション防止のため、各修正に対応する単体テスト（vitest）と E2E テスト（Playwright）を計画に盛り込みます。

---

## 対象ファイル一覧

| ID | 対象ファイル | 変更内容 |
|----|-------------|---------|
| S-01 | `apps/remix/app/components/general/app-banner.tsx` | XSS サニタイズ導入 |
| S-01 (test 新規) | `packages/lib/universal/sanitize-banner-content.test.ts` | サニタイズ関数の単体テスト |
| S-01 (test 新規) | `packages/app-tests/e2e/security-app-banner-xss.spec.ts` | XSS 描画防止の E2E テスト |
| S-02 | `.env.example` | デフォルトシークレットをプレースホルダーに変更 |
| S-03 | `package.json` / `package-lock.json` | 脆弱な依存パッケージのアップデート |
| S-03 (CI) | `.github/workflows/`（存在する場合）| `npm audit` を CI に組み込む |

---

## S-01: サイト設定バナーの保存型 XSS 修正

### 現状

`apps/remix/app/components/general/app-banner.tsx:19`

```tsx
<span dangerouslySetInnerHTML={{ __html: banner.data.content }} />
```

`packages/lib/server-only/site-settings/schemas/banner.ts` の `content` は `z.string()` のみでサニタイズを実施していません。管理者が任意の HTML/JS を設定でき、全利用者のブラウザで実行される保存型 XSS の脆弱性です。

### 修正方針

1. `packages/lib/universal/sanitize-banner-content.ts` を新規作成し、DOMPurify 相当の HTML サニタイズ関数を実装する（`<script>`, `<iframe>`, `on*` イベントハンドラ, `javascript:` スキームを除去）
2. `app-banner.tsx` でサニタイズ済み HTML を描画する
3. `banner.data.content` に対する zod スキーマは `z.string()` のまま（長さ制限のみ追加検討）

### 実装ステップ

1. `packages/lib/universal/sanitize-banner-content.ts` を作成（サニタイズ関数 `sanitizeBannerContent(html: string): string`）
2. `packages/lib/universal/sanitize-banner-content.test.ts` を作成（単体テスト）
3. `apps/remix/app/components/general/app-banner.tsx` を修正し、サニタイズ関数を適用
4. `packages/app-tests/e2e/security-app-banner-xss.spec.ts` を作成（E2E テスト）

### リグレッション防止テスト (S-01)

**単体テスト** (`packages/lib/universal/sanitize-banner-content.test.ts`):

| テストケース | 入力 | 期待結果 |
|-------------|------|---------|
| プレーンテキスト | `お知らせ` | そのまま出力 |
| `<script>` タグ除去 | `<script>alert(1)</script>hello` | `hello` |
| `onerror` 属性除去 | `<img src=x onerror=alert(1)>` | `<img src=x>` または `` 除去 |
| `javascript:` スキーム除去 | `<a href="javascript:alert(1)">リンク</a>` | `<a>リンク</a>` |
| `<iframe>` 除去 | `<iframe src="https://evil.com"></iframe>` | 空文字 |
| 安全なタグ許容 | `<b>太字</b>` | `<b>太字</b>` |
| 空文字 | `""` | `""` |
| `undefined`/`null` 相当 | 空文字 | 空文字 |

**E2E テスト** (`packages/app-tests/e2e/security-app-banner-xss.spec.ts`):

| シナリオ | 操作 | 検証 |
|---------|------|------|
| 管理者がスクリプト入りバナーを保存 | 設定画面で `<script>alert('xss')</script>` を content に入力 | バナーエリアに `alert` 関数が定義されていないこと（window.alert が呼ばれない） |
| イベントハンドラ属性 | `<img onerror=...>` を content に入力 | DOM に `onerror` 属性が残っていないこと |
| 正常なバナー表示 | プレーンテキストを入力 | 表示されること |

---

## S-02: `.env.example` の弱いデフォルトシークレット修正

### 現状

`.env.example` に以下の弱い/固定値デフォルトが記載されています。

- `NEXTAUTH_SECRET="secret"` — セッション署名キー（推測可能）
- `NEXT_PRIVATE_ENCRYPTION_KEY="CAFEBABE"` / `SECONDARY_KEY="DEADBEEF"` — 文書暗号化キー（固定値）
- DB/SMTP パスワード `password`（固定値）

`.env` は `.gitignore` で除外済み（未追跡）のためリポジトリ汚染は発生していませんが、`.env.example` をコピーして展開した環境では弱い鍵が使用されます。

### 修正方針

- すべてのシークレット系デフォルト値を空文字または明示的なプレースホルダー（`"CHANGE_ME"` 等）に変更
- コメントで「本番環境では必ずランダム値を設定してください」を明記
- `NEXTAUTH_SECRET` は最低 32 文字以上のランダム文字列を推奨する旨をコメントに記載

### 実装ステップ

1. `.env.example` を編集し、シークレットデフォルトをプレースホルダーに変更
2. コメントで生成方法（`openssl rand -hex 32` 等）を案内

### リグレッション防止テスト (S-02)

スクリプトテスト (`scripts/check-env-secrets.mjs` 新規 または 既存 `scripts/check-translations.mjs` パターンにならう):

| チェック項目 | 判定 |
|-------------|------|
| `NEXTAUTH_SECRET` が `"secret"` ではない | OK/NG |
| `NEXT_PRIVATE_ENCRYPTION_KEY` が `"CAFEBABE"` ではない | OK/NG |
| `NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY` が `"DEADBEEF"` ではない | OK/NG |
| DB パスワードが `"password"` ではない | OK/NG |

CI で `.env.example` に弱いデフォルトが含まれていないことを検証するステップを追加。

---

## S-03: 依存関係の既知脆弱性修正 (`npm audit`)

### 現状

`npm audit --audit-level=moderate` 結果: Critical 0 / High 17 / Moderate 7 / Low 2 / Total 26

主要な脆弱パッケージ:

| パッケージ | 深刻度 | 主な CVE | 経由 |
|-----------|--------|---------|------|
| `adm-zip` | High | ZIP slip, メモリ枯渇 DoS, symlink 任意ファイル書き換え等 | `inngest-cli` |
| `@lingui/cli` | High | `chokidar`/`micromatch` 経由 | 直接依存 |
| `@prisma/config` | High | `deepmerge-ts` 経由 | `prisma` |
| `@tailwindcss/typography` | Moderate | `postcss-selector-parser` | 直接依存 |
| `braces` | High | スタック枯渇 DoS | `chokidar`, `micromatch` |

### 修正方針

1. `npm audit fix` で修正可能なものを適用
2. 修正不可（Major バージョンアップが必要）なものは、パッチ適用または代替パッケージを検討
3. `package-lock.json` を更新し、変更をコミット

### 実装ステップ

1. `npm audit --audit-level=moderate` の全出力を確認し、修正対象を特定
2. `npm audit fix` を実行
3. 残存脆弱性について個別に対応（バージョンアップ or パッチ）
4. `npm run lint` (biome check) でコードチェック
5. `npx tsc --noEmit` で型チェック（AGENTS.md の推奨）

### リグレッション防止テスト (S-03)

CI ワークフローに `npm audit --audit-level=high` ステップを追加し、High 以上の脆弱性が検出された場合に CI を失敗させる。

```yaml
- name: Security audit
  run: npm audit --audit-level=high
```

---

## 実装スケジュール（推定）

| フェーズ | 作業 | 見積工数 |
|---------|------|---------|
| Phase 1 | S-01 サニタイズ関数実装 + 単体テスト | 1〜2 時間 |
| Phase 1 | S-01 app-banner.tsx 修正 + E2E テスト | 1〜2 時間 |
| Phase 1 | S-02 .env.example 修正 + シークレットチェックスクリプト | 1 時間 |
| Phase 2 | S-03 npm audit 修正 + package-lock 更新 | 2〜4 時間 |
| Phase 2 | lint / typecheck / テスト実行 | 1〜2 時間 |
| Phase 3 | CI への `npm audit` 組み込み | 1 時間 |

---

## 受入基準 (Definition of Done)

1. `packages/lib/universal/sanitize-banner-content.test.ts` の全テストがパスする
2. `packages/app-tests/e2e/security-app-banner-xss.spec.ts` の全テストがパスする
3. `app-banner.tsx` で `dangerouslySetInnerHTML` に渡す前に `sanitizeBannerContent` を必ず通す
4. `.env.example` に `"secret"`, `"CAFEBABE"`, `"DEADBEEF"`, `"password"` の固定シークレットが含まれない
5. `npm audit --audit-level=high` で High 以上の脆弱性が 0 件である（または意図的な例外のみ）
6. `npm run lint` (biome check) がエラーなしで完了
7. `npx tsc --noEmit` がエラーなしで完了
8. 既存の単体テスト・E2E テストがすべてパスする（リグレッションなし）

---

## 実行コマンド（参考）

```bash
# ライブラリ単体テスト実行
npm run test -w @documenso/lib

# E2E テスト実行（Playwright）
npm run test:e2e

# リンタ実行
npm run lint

# 型チェック（特定パッケージ）
npx tsc --noEmit -p packages/lib/tsconfig.json

# 脆弱性チェック
npm audit --audit-level=moderate
```
