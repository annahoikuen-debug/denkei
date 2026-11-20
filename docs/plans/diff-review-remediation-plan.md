# 差分レビュー指摘事項・詳細実装計画書
(Diff Review Remediation & Implementation Plan)

- **作成日**: 2026-11-19
- **ステータス**: 計画承認待ち (Draft / Pending Approval)
- **対象リポジトリ**: `E:\Denkei\denkei`
- **前提**: `code-review-remediation-plan.md` の TASK-01〜12 実装完了後の差分レビュー（35 ファイル、+1,325/−135 行）で検出された指摘事項

---

## 1. 概要と目的

TASK-01〜12 の実装差分に対するレビューで検出された **2 件の P0 課題** と **7 件の P1-P2 課題** を解消し、
実装の整合性・保守性を確保するための詳細実装計画書。

各タスクは以下の構造で定義する:
- 課題と背景（レビュー指摘の内容と影響）
- 修正方針（具体的な変更内容）
- 対象ファイル
- テスト・受入基準

---

## 2. タスク一覧サマリ

| Phase | Task ID | 優先度 | 項目名 | 対象領域 |
|:---:|:---:|:---:|:---|:---|
| **Phase 1** | **DR-01** | **P0 (High)** | テストアーティファクトの Git 管理除外 (`coverage-output.txt`) | Repo Hygiene |
| **Phase 1** | **DR-02** | **P0 (High)** | `assert-webhook-url.test.ts` の仕様逸脱コメント修正 | Tests / Webhooks |
| **Phase 2** | **DR-03** | **P1 (Medium)** | `create-document-audit-log.ts` のインポート元不整合解消 | Consistency / Prisma |
| **Phase 2** | **DR-04** | **P1 (Medium)** | `$executeRawUnsafe` → `$executeRaw`（タグドテンプレート）への変更 | Security / DB |
| **Phase 2** | **DR-05** | **P1 (Medium)** | `validationMiddleware`（実質 no-op）の削除 | TRPC / Dead Code |
| **Phase 3** | **DR-06** | **P2 (Low)** | `hashStringToInt32` の衝突挙動に関するドキュメント整備 | Docs / Audit Log |
| **Phase 3** | **DR-07** | **P2 (Low)** | レート制限の本番監視計画を運用手順書に追記 | Ops / Rate Limit |
| **Phase 3** | **DR-08** | **P2 (Low)** | カバレッジ計測の形骸化への対応方針明記 | Tests / Vitest |
| **Phase 3** | **DR-09** | **P2 (Low)** | `vitest.setup.ts` の `declare global` 型拡充 | Tests / Types |

---

## 3. Phase 1: 直ちに対応すべき項目 (P0)

### DR-01: テストアーティファクトの Git 管理除外 (`coverage-output.txt`)

#### 課題と背景
- **発生事象**: テスト実行時に `packages/lib/coverage-output.txt` が生成され、untracked ファイルとしてリポジトリに残存している。
- **影響度**: 意図しないコミットによるリポジトリ汚染、差分レビューのノイズ増大。

#### 修正方針
1. ルート `.gitignore` に以下を追加:
   ```gitignore
   # Test artifacts
   coverage-output.txt
   coverage/
   *.lcov
   ```
2. 既存の untracked ファイルは削除する（`git clean -f packages/lib/coverage-output.txt`）。

#### 対象ファイル
- `denkei/.gitignore`
- `packages/lib/coverage-output.txt`（削除）

#### テスト・受入基準
- `git status --short` で `coverage-output.txt` が表示されないこと。
- テスト再実行後に同ファイルが再生成されても untracked に現れないこと。

---

### DR-02: `assert-webhook-url.test.ts` の仕様逸脱コメント修正

#### 課題と背景
- **発生事象**: `withTimeout` の仕様変更（タイムアウト時 `null` 返却 → `TimeoutError` スロー）により、
  `packages/lib/server-only/webhooks/assert-webhook-url.test.ts:106-107` の以下のコメントが現状の動作と乖離している:
  ```
  // withTimeout races the lookup against a 250ms timer and returns null
  // if the lookup doesn't settle in time, so the function returns early.
  ```
- **影響度**: 将来の保守担当者が誤った仕様を前提にコードを変更するリスク。

#### 修正方針
コメントを新仕様に合わせて更新する:
```ts
// withTimeout races the lookup against a 250ms timer and throws a
// TimeoutError if the lookup doesn't settle in time. The outer catch
// swallows non-AppError exceptions, so the function returns early.
```

#### 対象ファイル
- `packages/lib/server-only/webhooks/assert-webhook-url.test.ts`

#### テスト・受入基準
- `cd packages/lib && npx vitest run server-only/webhooks` で 34/34 pass を維持すること。
- コメント内容が `assert-webhook-url.ts` の実際の動作（catch 節で早期 return）と一致していること。

---

## 4. Phase 2: 整合性・セキュリティ堅牢化 (P1)

### DR-03: `create-document-audit-log.ts` のインポート元不整合解消

#### 課題と背景
- **発生事象**: 実装時に `@documenso/prisma/client` → `@prisma/client` へインポート元が変更されたが、
  同ディレクトリの `create-document-audit-log.test.ts:2` は `@documenso/prisma/client` のまま。
- **影響度**: ワークスペースエイリアスと直接パッケージ参照の混在により、
  Prisma クライアントの生成方式変更時に型の二重定義や解決失敗が発生する可能性。

#### 修正方針
プロジェクトの主流（`@documenso/prisma/client`）に統一する:
```ts
// packages/lib/server-only/document/create-document-audit-log.ts (先頭)
import type { prisma } from '@documenso/prisma';
import type { DocumentAuditLog, Prisma } from '@documenso/prisma/client';
```

#### 対象ファイル
- `packages/lib/server-only/document/create-document-audit-log.ts`

#### テスト・受入基準
- `cd packages/lib && npx vitest run server-only/document/create-document-audit-log.test.ts` で 3/3 pass。
- `npx tsc --noEmit` で 0 errors。
- プロジェクト内 grep（`from '@prisma/client'`）で packages/lib 配下に他の不整合がないこと。

---

### DR-04: `$executeRawUnsafe` → `$executeRaw`（タグドテンプレート）への変更

#### 課題と背景
- **発生事象**: `create-document-audit-log.ts:45` で固定 SQL に対して `$executeRawUnsafe` を使用している:
  ```ts
  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock($1, $2)`, ...);
  ```
- **影響度**: パラメータはプレースホルダ渡しのため実害はないが、
  `$executeRawUnsafe` は任意文字列実行を許す API であり、将来の改変時にインジェクション余地を残す。
  静的解析（Semgrep 等）でも警告対象になり得る。

#### 修正方針
Prisma のタグドテンプレート API に置換する:
```ts
await tx.$executeRaw`SELECT pg_advisory_xact_lock(${AUDIT_LOG_ADVISORY_LOCK_KEY[0]}, ${lockKey})`;
```

#### 対象ファイル
- `packages/lib/server-only/document/create-document-audit-log.ts`
- `packages/lib/server-only/document/create-document-audit-log.test.ts`（モックの検証方法をタグドテンプレート呼び出しに対応）

#### テスト・受入基準
- テスト 3/3 pass（`mockExecuteRaw` が呼ばれることを確認）。
- `grep -n "executeRawUnsafe" packages/lib` で 0 件になること（他ファイルに usage があれば個別評価）。

---

### DR-05: `validationMiddleware`（実質 no-op）の削除

#### 課題と背景
- **発生事象**: `packages/trpc/server/trpc.ts` に追加された `validationMiddleware` は `input` を受け取るが
  何も処理せず `next()` を呼ぶだけの実質 no-op である。
- **影響度**: デッドコードによる可読性低下、全プロシージャでの不要なミドルウェア実行オーバーヘッド。

#### 修正方針
1. `validationMiddleware` の定義と `procedure` チェーンからの `.use(validationMiddleware)` を削除する。
2. Zod バリデーションは各プロシージャの `input: ZodSchema` で自動適用されるため、
   将来追加が必要になった時点で新規ミドルウェアとして実装する。

#### 対象ファイル
- `packages/trpc/server/trpc.ts`

#### テスト・受入基準
- `npx tsc --noEmit -p packages/trpc` で 0 errors。
- `grep -n "validationMiddleware" packages/trpc` で 0 件。
- 既存 TRPC プロシージャの動作に影響がないこと（`npm run build` 成功）。

---

## 5. Phase 3: ドキュメント・運用整備 (P2)

### DR-06: `hashStringToInt32` の衝突挙動に関するドキュメント整備

#### 課題と背景
- **発生事象**: `create-document-audit-log.ts:92-100` の JS ビット演算ハッシュは衝突確率が高め。
  Advisory Lock の目的（同一 envelopeId の直列化）に対し、衝突時は「異なる envelopeId が同一 lockKey になり過剰直列化される」だけで整合性は保たれるが、この挙動が明文化されていない。
- **影響度**: 将来の最適化（衝突率の低いハッシュへの変更等）時に設計意図が失われる。

#### 修正方針
関数直上の JSDoc に以下を追記する:
```ts
/**
 * 文字列を 32bit 符号付き整数に変換して Advisory Lock キーの第二要素として使用する。
 *
 * 注意: 簡易ハッシュのため衝突の可能性がある。衝突時は異なる envelopeId が
 * 同一 lockKey にマッピングされ、一時的に過剰直列化されるが、ハッシュチェーンの
 * 整合性（フォーク防止）には影響しない。lockKey は排他の粒度を「envelopeId 単位
 * 以上に細かくしない」ための手段であり、逆写像は不要。
 */
```

#### 対象ファイル
- `packages/lib/server-only/document/create-document-audit-log.ts`

#### テスト・受入基準
- 既存テスト 3/3 pass（ドキュメントのみの変更のため回帰なし）。

---

### DR-07: レート制限の本番監視計画を運用手順書に追記

#### 課題と背景
- **発生事象**: `trpc.ts` の `rateLimitMiddleware` により全プロシージャに 1 分 100 リクエストの制限が適用された。
  署名完了フロー（監査ログ + webhook 連鎖）やドキュメント一覧の高頻度操作で誤検知の可能性がある。
- **影響度**: 本番で正当なユーザー操作が `TOO_MANY_REQUESTS` で阻害されるリスク。

#### 修正方針
1. `OPERATIONS_MANUAL.md` に「レート制限監視」セクションを新設:
   - 監視対象メトリクス: `TOO_MANY_REQUESTS`（HTTP 429）の発生率、TRPC path 別の 429 集計
   - アラート条件: 429 発生率が 1 時間で 0.5% 超過
   - 対応手順: 対象 path の特定（`ctx.logger` の `rateLimitRemaining` を確認）→ `apiTrpcRateLimit` の上限調整 or path 別除外の検討
2. 閾値調整は環境変数化（例: `TRPC_RATE_LIMIT_MAX`）を将来タスクとして記載。

#### 対象ファイル
- `denkei/OPERATIONS_MANUAL.md`

#### テスト・受入基準
- 手順書に監視メトリクス・アラート条件・対応手順が明記されていること。

---

### DR-08: カバレッジ計測の形骸化への対応方針明記

#### 課題と背景
- **発生事象**: `packages/lib/vitest.config.ts` でカバレッジ閾値（80%）を削除し `include: ['**/*.ts']` に拡大した結果、
  v8 + `vmThreads` の既知制約によりカバレッジ値が 0% 表示となり、計測が形骸化している。
- **影響度**: テスト品質の可視性低下。

#### 修正方針
1. `vitest.config.ts` の `coverage` にコメントで現状と方針を明記:
   ```ts
   coverage: {
     // NOTE: v8 provider + vmThreads pool の制約により TypeScript ファイルの
     // カバレッジが正確に計測されない（0% 表示となる既知問題）。
     // 閾値は意図的に無効化中。provider を istanbul に戻すか pool を threads に
     // 変更した際に thresholds: { lines: 80, ... } を再導入すること。
   ```
2. 対応オプションの検討記録を `docs/plans/` に残す（istanbul 試行時のエラー
   "Coverage must be initialized with a path or an object" の回避策調査）。

#### 対象ファイル
- `packages/lib/vitest.config.ts`

#### テスト・受入基準
- `npm test`（packages/lib）が引き続き成功すること。
- コメントにより意図的な無効化であることが将来の閲覧者に伝わること。

---

### DR-09: `vitest.setup.ts` の `declare global` 型拡充

#### 課題と背景
- **発生事象**: `vitest.setup.ts:22` の `declare global { var vi: { stubEnv?...; unstubAllEnvs?... } }` は
  Vitest 本物の `vi` 型と交差し、`vi.mock` 等の標準 API がこの型から見えない。
- **影響度**: 型補完の欠如、将来のテスト作成時の混乱。実行時は Vitest の実際の `vi` を参照するため動作は問題なし。

#### 修正方針
型拡張を `interface` のマージで行い、Vitest の `vi` 型を継承させる:
```ts
import type { vi as vitestVi } from 'vitest';

declare global {
  // eslint-disable-next-line no-var
  var vi: typeof vitestVi & {
    stubEnv?: typeof stubEnv;
    unstubAllEnvs?: typeof unstubAllEnvs;
  };
}
```
（`typeof vitestVi` の取り込みが循環参照になる場合は、コメントで実行時は Vitest の `vi` を参照することを明記するのみとする）

#### 対象ファイル
- `packages/lib/vitest.setup.ts`

#### テスト・受入基準
- `npx tsc --noEmit -p packages/lib` で 0 errors。
- `npm test`（packages/lib）が引き続き成功すること。

---

## 6. 検証・品質保証計画 (Verification Strategy)

各タスク完了時に以下を実行する:

```bash
# 1. 影響パッケージのテスト
cd denkei/packages/lib && npx vitest run

# 2. TRPC 型チェック
cd denkei/packages/trpc && npx tsc --noEmit

# 3. Biome 静的解析（変更ファイルのみ）
cd denkei/packages/lib && npx biome check <changed files>
cd denkei/packages/trpc && npx biome check <changed files>

# 4. Git 状態確認（DR-01）
git status --short
```

---

## 7. ロールバック方針

- **DR-01**: `.gitignore` 1 行削除で即時ロールバック可能。
- **DR-02 / DR-06**: コメント変更のみのため、git revert で対応。
- **DR-03 / DR-04**: `create-document-audit-log.ts` のインポート/executeRaw 呼び出しを旧実装に戻す。DB スキーマ非依存のため影響範囲ゼロ。
- **DR-05**: `validationMiddleware` の定義と `.use()` を復元すれば即時ロールバック可能。
- **DR-07〜09**: ドキュメント・コメント・型定義のみのため、部分 revert で対応。

---

## 8. 実施順序と所要時間の目安

| 順序 | Task | 所要時間（目安） | 依存関係 |
|:---:|:---|:---:|:---|
| 1 | DR-01 (.gitignore) | 5 分 | なし |
| 2 | DR-02 (テストコメント) | 5 分 | なし |
| 3 | DR-05 (no-op ミドルウェア削除) | 15 分 | なし |
| 4 | DR-04 ($executeRaw 化) | 20 分 | DR-03 と同時実施可 |
| 5 | DR-03 (インポート統一) | 10 分 | なし |
| 6 | DR-06 (JSDoc 追記) | 5 分 | DR-04 完了後 |
| 7 | DR-09 (setup 型拡充) | 15 分 | なし |
| 8 | DR-08 (カバレッジ方針明記) | 10 分 | なし |
| 9 | DR-07 (運用手順書) | 20 分 | なし |

**合計**: 約 1.5〜2 時間（検証コマンド実行時間を除く）
