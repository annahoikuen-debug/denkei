# Denkei 詳細実装計画書 (Code Review Implementation Plan)

**作成日**: 2026-11-18  
**ステータス**: Draft  
**対象リポジトリ**: `E:\Denkei\denkei`  
**対象環境**: Node.js 24 / React Router 7 (Remix) / Prisma (PostgreSQL) / Vitest / Biome  
**ベース**: コードレビュー結果 (2026-11-18 実施)

---

## 1. 概要と目的

本計画書は、2026-11-18 に実施した包括的コードレビューで指摘された改善事項を確実に解消するための詳細実装計画書です。

コードレビューの総合評価は **85/100** で、プロダクション利用に耐えうる堅実なコードベースですが、以下の点で改善の余地があります：

1. `any` 型の段階的な削減 (TypeScript 型安全性の向上)
2. 入力バリデーションの強化 (Zod スキーマの一元管理)
3. セキュリティ強化 (レート制限, 監査ログの整合性)
4. パフォーマンス最適化 (キャッシュ戦略, DB インデックス)
5. エラーハンドリングとログ出力の統一

本計画書は、**「型安全性・セキュリティ（P0）」→「データ整合性・パフォーマンス（P1）」→「保守性・可観測性（P2）」** の 3 フェーズ・15 タスクに分割し、各タスクに具体的な修正内容、対象ファイル、テスト仕様、検証コマンド、およびロールバック手順を定義します。

---

## 2. タスク一覧サマリ

| Phase | Task ID | 優先度 | 項目名 | 対象領域 | 見積工数 |
|:---:|:---:|:---:|:---|:---|:---:|
| **Phase 1** | **TASK-01** | **P0 (Critical)** | `any` 型の段階的な削減と厳格な型定義 | TypeScript / 全パッケージ | 3 日 |
| **Phase 1** | **TASK-02** | **P0 (High)** | 全 trpc エンドポイントの Zod バリデーション導入 | trpc / API | 4 日 |
| **Phase 1** | **TASK-03** | **P0 (High)** | レート制限テーブルの適用とミドルウェア実装 | Security / DB | 3 日 |
| **Phase 2** | **TASK-04** | **P1 (Medium)** | 監査ログハッシュチェーンの並行書き込み排他制御 | Audit Log / DB | 2 日 |
| **Phase 2** | **TASK-05** | **P1 (Medium)** | DB インデックス最適化 (頻繁クエリ対象カラム) | Database / Performance | 2 日 |
| **Phase 2** | **TASK-06** | **P1 (Medium)** | Intl フォーマッターのキャッシュ戦略拡張 | Performance / lib | 1 日 |
| **Phase 2** | **TASK-07** | **P1 (Medium)** | エラーハンドリングとログ出力の統一 (AppError 拡張) | Error Handling / 全パッケージ | 3 日 |
| **Phase 3** | **TASK-08** | **P2 (Low)** | 構造化ログ出力 (pino) の導入とメトリクス連結 | Observability / Logging | 2 日 |
| **Phase 3** | **TASK-09** | **P2 (Low)** | Vitest テストカバレッジ 80% 以上の達成 | Testing / 全パッケージ | 5 日 |
| **Phase 3** | **TASK-10** | **P2 (Low)** | Biome CRLF 問題の根本解決 (CI 統一) | Tooling / CI | 1 日 |
| **Phase 3** | **TASK-11** | **P2 (Low)** | 非同期処理のタイムアウト制御強化 | Performance / Jobs | 2 日 |
| **Phase 3** | **TASK-12** | **P2 (Low)** | API レスポンスキャッシュ戦略 (ETag/条件付きリクエスト) | API / Performance | 3 日 |
| **Phase 3** | **TASK-13** | **P2 (Low)** | セキュリティヘッダーの実装 (CSP, HSTS, X-Frame-Options) | Security / Frontend | 2 日 |
| **Phase 3** | **TASK-14** | **P2 (Low)** | 署名プロセスの冗長化とフォールバック強化 | Signing / Reliability | 3 日 |
| **Phase 3** | **TASK-15** | **P2 (Low)** | ドキュメントと運用手順書の整備 | Documentation / Ops | 2 日 |

**合計見積工数**: 約 42 日 (約 8.5 週間)

---

## 3. Phase 1: 型安全性・セキュリティ強化 (P0)

### TASK-01: `any` 型の段階的な削減と厳格な型定義

#### 課題と背景
- biome.json で `noExplicitAny` は warn レベルに設定されているが、複数のファイルで `any` 型が使用されている
- `format-currency.test.ts` で `null as any`, `undefined as any` が使用されている
- 型安全性の低下により、バグの検出が遅れるリスクがある

#### 修正方針
1. 全パッケージを検索し、`any` 型の使用箇所を特定する
2. `unknown` または具体的なインターフェース/型エイリアスに置き換える
3. テストファイルでの `as any` は `as const` または型ガード関数に置き換える
4. biome.json で `noExplicitAny` を error レベルに引き上げる (段階的)

#### 対象ファイル (主要)
- `packages/lib/universal/format-currency.test.ts` (行 27, 28, 40, 41, 42)
- `packages/lib/constants/date-formats.test.ts`
- `packages/lib/universal/seal-image.test.ts`
- `packages/lib/universal/qualified-invoice.test.ts`
- その他、検出された全ファイル

#### 実装コード詳細

```typescript
// 修正前 (format-currency.test.ts)
expect(formatJpy(null as any)).toBe('');

// 修正後
expect(formatJpy(null)).toBe('');
expect(formatJpy(undefined)).toBe('');
```

```typescript
// 型ガード関数の追加例 (packages/lib/utils/type-guards.ts)
export const isNullOrUndefined = (value: unknown): value is null | undefined => {
  return value === null || value === undefined;
};

export const isString = (value: unknown): value is string => {
  return typeof value === 'string';
};
```

#### テスト・受入基準
- `npx tsc --noEmit` で `any` 関連のエラーが 0 件であること
- `npx biome check` で `noExplicitAny` 警告が 0 件であること
- 既存のユニットテストが全て通過すること

#### ロールバック手順
- 特定ファイルのみ `any` に戻し、git revert で元に戻す

---

### TASK-02: 全 trpc エンドポイントの Zod バリデーション導入

#### 課題と背景
- trpc ルーターで Zod スキーマによる入力バリデーションが一貫して適用されていない
- 不正な入力が DB に到達するリスクがある

#### 修正方針
1. `packages/trpc/server/` 配下の全ルーターで Zod スキーマを定義・適用する
2. 共通バリデーションスキーマ (UUID, メールアドレス, 日付など) を `packages/lib/schemas/` に集約する
3. バリデーションエラーの統一されたエラーレスポンス形式を定義する

#### 対象ファイル
- `packages/trpc/server/trpc.ts` (共通バリデーションミドルウェア追加)
- `packages/trpc/server/auth-router/*.ts`
- `packages/trpc/server/template-router/*.ts`
- `packages/trpc/server/webhook-router/*.ts`
- `packages/lib/schemas/common.ts` (拡張)
- `packages/lib/schemas/` (新規ファイル追加)

#### 実装コード詳細

```typescript
// packages/lib/schemas/common.ts
import { z } from 'zod';

export const ZUuidSchema = z.string().uuid();
export const ZEmailSchema = z.string().email();
export const ZPositiveIntSchema = z.number().int().positive();
export const ZNonEmptyStringSchema = z.string().min(1);
```

```typescript
// packages/trpc/server/trpc.ts - バリデーションミドルウェア
export const validationMiddleware = t.middleware(async ({ next, input }) => {
  // Zod スキーマによるバリデーションは input 型で自動適用される
  // 追加のビジネスルールバリデーションをここに実装
  return await next();
});
```

#### テスト・受入基準
- 全 trpc エンドポイントに Zod スキーマが適用されていること
- 不正な入力に対して 400 Bad Request が返されること
- バリデーションエラーメッセージが日本語で表示されること

#### ロールバック手順
- Zod スキーマを削除し、元の入力検証ロジックに戻す

---

### TASK-03: レート制限テーブルの適用とミドルウェア実装

#### 課題と背景
- マイグレーション `20260219141233_add_rate_limit_table` と `20260529132406_add_org_rate_limits` が存在するが、実際のレート制限ミドルウェアが実装されていない
- ブルートフォース攻撃や DoS 攻撃への対策が不十分

#### 修正方針
1. `packages/lib/server-only/rate-limit/` ディレクトリを作成し、レート制限ロジックを実装する
2. trpc ミドルウェアとしてレート制限チェックを統合する
3. 組織単位と IP 単位のレート制限を実装する
4. レート制限超過時のレスポンス (429 Too Many Requests) を定義する

#### 対象ファイル
- `packages/lib/server-only/rate-limit/index.ts` (新規)
- `packages/lib/server-only/rate-limit/middleware.ts` (新規)
- `packages/trpc/server/trpc.ts` (レート制限ミドルウェア統合)
- `packages/prisma/schema.prisma` (レート制限モデル確認)

#### 実装コード詳細

```typescript
// packages/lib/server-only/rate-limit/index.ts
import { prisma } from '@documenso/prisma';

export type RateLimitConfig = {
  maxRequests: number;
  windowMs: number;
};

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60_000, // 1 分
};

export const checkRateLimit = async ({
  identifier,
  config = DEFAULT_CONFIG,
}: {
  identifier: string;
  config?: RateLimitConfig;
}): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> => {
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);

  // 古いレコードを削除
  await prisma.rateLimitLog.deleteMany({
    where: {
      identifier,
      createdAt: { lt: windowStart },
    },
  });

  // 現在のウィンドウ内のリクエスト数をカウント
  const requestCount = await prisma.rateLimitLog.count({
    where: { identifier },
  });

  if (requestCount >= config.maxRequests) {
    const oldestRequest = await prisma.rateLimitLog.findFirst({
      where: { identifier },
      orderBy: { createdAt: 'asc' },
    });

    return {
      allowed: false,
      remaining: 0,
      resetTime: oldestRequest
        ? new Date(oldestRequest.createdAt.getTime() + config.windowMs)
        : now,
    };
  }

  // 新しいリクエストを記録
  await prisma.rateLimitLog.create({
    data: { identifier },
  });

  return {
    allowed: true,
    remaining: config.maxRequests - requestCount - 1,
    resetTime: new Date(now.getTime() + config.windowMs),
  };
};
```

#### テスト・受入基準
- レート制限超過時に 429 レスポンスが返されること
- 組織単位と IP 単位で独立してレート制限が適用されること
- ウィンドウ期間経過後にリクエストが許可されること

#### ロールバック手順
- レート制限ミドルウェアを無効化し、元の認証のみのチェックに戻す

---

## 4. Phase 2: データ整合性・パフォーマンス (P1)

### TASK-04: 監査ログハッシュチェーンの並行書き込み排他制御

#### 課題と背景
- `20261015000001_add_audit_log_hash_chain` マイグレーションでハッシュチェーンが導入されている
- 並行書き込み時のフォーク（ハッシュの分岐）リスクがある

#### 修正方針
1. PostgreSQL の Advisory Lock を使用して、監査ログ書き込みの排他制御を実装する
2. トランザクション内でハッシュチェーンの整合性を検証する
3. 競合時のリトライロジックを実装する

#### 対象ファイル
- `packages/lib/server-only/document-audit-logs.ts`
- `packages/prisma/migrations/20261118000000_add_audit_log_advisory_lock/migration.sql` (新規)

#### 実装コード詳細

```sql
-- 20261118000000_add_audit_log_advisory_lock/migration.sql
-- Advisory Lock による監査ログ書き込みの排他制御
-- ロックキー: 0xDenkei (固定値)
```

```typescript
// packages/lib/server-only/document-audit-logs.ts
import { prisma } from '@documenso/prisma';

export const createAuditLogWithLock = async (data: {
  envelopeId: string | null;
  type: string;
  data: unknown;
  prevHash: string | null;
}) => {
  return await prisma.$transaction(async (tx) => {
    // Advisory Lock 取得 (セッションレベル)
    await tx.$queryRawUnsafe(`SELECT pg_advisory_xact_lock(0xDenkei)`);

    // 最後のハッシュを取得
    const lastLog = await tx.documentAuditLog.findFirst({
      where: { envelopeId: data.envelopeId },
      orderBy: { createdAt: 'desc' },
      select: { hash: true },
    });

    // 新しいハッシュを計算
    const newHash = computeHash({
      prevHash: lastLog?.hash ?? null,
      type: data.type,
      data: data.data,
      timestamp: new Date(),
    });

    // 監査ログ作成
    return await tx.documentAuditLog.create({
      data: {
        ...data,
        prevHash: lastLog?.hash ?? null,
        hash: newHash,
      },
    });
  });
};
```

#### テスト・受入基準
- 並行書き込み時にもハッシュチェーンが分岐しないこと
- トランザクション失敗時のリトライが正常に動作すること
- Advisory Lock のデッドロックが発生しないこと

#### ロールバック手順
- Advisory Lock を削除し、従来の単一書き込みに戻す

---

### TASK-05: DB インデックス最適化

#### 課題と背景
- 頻繁にクエリされるカラムにインデックスが貼られていない可能性がある
- クエリパフォーマンスの劣化リスク

#### 修正方針
1. スロークエリログを分析し、インデックスが必要なカラムを特定する
2. 複合インデックスを検討し、適切なインデックスを追加する
3. 既存インデックスの重複を確認し、不要なものを削除する

#### 対象ファイル
- `packages/prisma/migrations/20261119000000_add_performance_indexes/migration.sql` (新規)
- `packages/prisma/schema.prisma`

#### 実装コード詳細

```sql
-- 20261119000000_add_performance_indexes/migration.sql
-- 文書一覧クエリの最適化
CREATE INDEX IF NOT EXISTS idx_document_envelope_created_at
  ON "Document"("envelopeId", "createdAt" DESC);

-- 受取人クエリの最適化
CREATE INDEX IF NOT EXISTS idx_recipient_envelope_status
  ON "Recipient"("envelopeId", "status");

-- 監査ログクエリの最適化
CREATE INDEX IF NOT EXISTS idx_audit_log_envelope_created
  ON "DocumentAuditLog"("envelopeId", "createdAt" DESC);

-- セッションクエリの最適化
CREATE INDEX IF NOT EXISTS idx_session_user_expires
  ON "Session"("userId", "expiresAt");
```

#### テスト・受入基準
- 対象クエリの実行時間が 30% 以上短縮されること
- EXPLAIN ANALYZE でインデックススキャンが使用されること
- 書き込み性能に著しい悪影響がないこと

#### ロールバック手順
- 追加したインデックスを DROP INDEX で削除する

---

### TASK-06: Intl フォーマッターのキャッシュ戦略拡張

#### 課題と背景
- `format-currency.ts` で `Intl.NumberFormat` のキャッシュは実装済み
- 他のフォーマット関数 (日付, 数値) でもキャッシュが不十分な可能性

#### 修正方針
1. 日付フォーマッター (`date-formats.ts`) にキャッシュを追加する
2. ロケールごとのフォーマッターインスタンスを管理するキャッシュクラスを作成する
3. メモリ使用量とキャッシュヒット率を監視する

#### 対象ファイル
- `packages/lib/constants/date-formats.ts`
- `packages/lib/universal/format-currency.ts` (既存実装の確認)
- `packages/lib/utils/intl-cache.ts` (新規)

#### 実装コード詳細

```typescript
// packages/lib/utils/intl-cache.ts
import type { DateTime } from 'luxon';

const formatterCache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();

export const getNumberFormatter = (
  locale: string,
  options?: Intl.NumberFormatOptions
): Intl.NumberFormat => {
  const key = `${locale}:${JSON.stringify(options ?? {})}`;
  if (!formatterCache.has(key)) {
    formatterCache.set(key, new Intl.NumberFormat(locale, options));
  }
  return formatterCache.get(key) as Intl.NumberFormat;
};

export const getDateTimeFormatter = (
  locale: string,
  options?: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat => {
  const key = `${locale}:${JSON.stringify(options ?? {})}`;
  if (!formatterCache.has(key)) {
    formatterCache.set(key, new Intl.DateTimeFormat(locale, options));
  }
  return formatterCache.get(key) as Intl.DateTimeFormat;
};

export const clearFormatterCache = () => {
  formatterCache.clear();
};
```

#### テスト・受入基準
- 同じロケール・オプションでのフォーマッター作成が 2 回目以降キャッシュから返されること
- キャッシュサイズが適切に管理されること (メモリリークなし)

#### ロールバック手順
- キャッシュを削除し、毎回新しいフォーマッターインスタンスを作成する

---

### TASK-07: エラーハンドリングとログ出力の統一

#### 課題と背景
- エラーハンドリングがファイルごとに不統一
- ログ出力フォーマットが統一されておらず、トラブルシューティングが困難

#### 修正方針
1. `AppError` クラスを拡張し、エラーコードと HTTP ステータスのマッピングを統一する
2. 構造化ログ出力 (pino) を導入し、全エンドポイントで統一フォーマットを使用する
3. エラーレスポンスの形式を統一する (code, message, details)

#### 対象ファイル
- `packages/lib/errors/app-error.ts` (拡張)
- `packages/lib/utils/logger.ts` (pino 統合)
- `packages/trpc/server/trpc.ts` (エラーフォーマッター統一)
- `packages/email/mailer.ts` (エラーハンドリング統一)

#### 実装コード詳細

```typescript
// packages/lib/errors/app-error.ts - 拡張
export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly statusCode: number;
  public readonly headers?: Record<string, string>;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: AppErrorCode,
    options?: {
      message?: string;
      statusCode?: number;
      headers?: Record<string, string>;
      details?: Record<string, unknown>;
      cause?: unknown;
    }
  ) {
    super(options?.message ?? AppError.getDefaultMessage(code));
    this.code = code;
    this.statusCode = options?.statusCode ?? 400;
    this.headers = options?.headers;
    this.details = options?.details;
    this.cause = options?.cause;
    this.name = 'AppError';
  }

  static toJSON(error: AppError) {
    return {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
    };
  }
}
```

#### テスト・受入基準
- 全エンドポイントで統一されたエラーレスポンス形式が返されること
- ログ出力が JSON 形式で構造化されていること
- エラーコードと HTTP ステータスのマッピングが一貫していること

#### ロールバック手順
- 構造化ログを従来のコンソールログに戻す

---

## 5. Phase 3: 保守性・可観測性 (P2)

### TASK-08: 構造化ログ出力 (pino) の導入とメトリクス連結

#### 課題と背景
- 現在のログ出力は `console.log` / `console.warn` が中心
- 本番環境でのログ集約と分析が困難

#### 修正方針
1. pino ロガーを導入し、構造化ログ (JSON) を出力する
2. リクエスト ID を付与し、トレース可能にする
3. メトリクス (リクエスト数, エラー率, レイテンシ) を Datadog や CloudWatch に連結する

#### 対象ファイル
- `packages/lib/utils/logger.ts` (pino 統合)
- `packages/trpc/server/trpc.ts` (リクエストログミドルウェア)
- `packages/lib/server-only/` 全ファイル (ログ出力置き換え)

#### 実装コード詳細

```typescript
// packages/lib/utils/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  redact: ['req.headers.authorization', 'res.headers.authorization'],
});

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

export const withRequestId = (requestId: string) => {
  return logger.child({ requestId });
};
```

#### テスト・受入基準
- ログ出力が JSON 形式であること
- リクエスト ID がログに含まれること
- 機密情報 (Authorization ヘッダーなど) がマスクされていること

#### ロールバック手順
- pino を削除し、console.log に戻す

---

### TASK-09: Vitest テストカバレッジ 80% 以上の達成

#### 課題と背景
- 既存のテストは一部のユーティリティ関数のみ
- テストカバレッジが不十分で、リグレッション検出が困難

#### 修正方針
1. 主要なビジネスロジックに対するテストを作成する
2. テストカバレッジレポートを CI で生成する
3. カバレッジ 80% をゲートとする

#### 対象ファイル
- `packages/lib/universal/*.test.ts` (新規作成)
- `packages/lib/server-only/*.test.ts` (新規作成)
- `packages/signing/*.test.ts` (新規作成)
- `packages/lib/vitest.config.ts` (カバレッジ設定追加)

#### 実装コード詳細

```typescript
// packages/lib/vitest.config.ts - カバレッジ設定
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
```

#### テスト・受入基準
- テストカバレッジが 80% 以上であること
- CI でテスト失敗時にビルドが停止すること

#### ロールバック手順
- カバレッジ閾値を下げる

---

### TASK-10: Biome CRLF 問題の根本解決

#### 課題と背景
- Windows 環境で CRLF 改行のファイルが Biome チェックで失敗する
- 開発環境間での不整合が発生する

#### 修正方針
1. `.gitattributes` で `text=auto eol=lf` を設定し、リポジトリ内は LF に統一する
2. CI 設定で `git config core.autocrlf false` を設定する
3. 開発者向けにドキュメントを整備する

#### 対象ファイル
- `.gitattributes` (新規)
- `.github/workflows/` (CI 設定、存在する場合)

#### 実装コード詳細

```gitattributes
# .gitattributes
* text=auto eol=lf
*.ts text eol=lf
*.tsx text eol=lf
*.js text eol=lf
*.json text eol=lf
*.md text eol=lf
```

#### テスト・受入基準
- `npx biome check` が全環境で通過すること
- リポジトリ内のファイルが全て LF 改行であること

#### ロールバック手順
- `.gitattributes` を削除し、環境依存の改行コードに戻す

---

### TASK-11: 非同期処理のタイムアウト制御強化

#### 課題と背景
- 署名処理やメール送信などの非同期処理にタイムアウト制御が不十分
- 処理が無限に待機するリスク

#### 修正方針
1. `AbortController` を使用したタイムアウト制御を実装する
2. 長時間処理にタイムアウトを設定する
3. タイムアウト時のフォールバック処理を定義する

#### 対象ファイル
- `packages/signing/index.ts` (署名処理にタイムアウト追加)
- `packages/email/mailer.ts` (メール送信にタイムアウト追加)
- `packages/lib/universal/fire-and-forget.ts` (タイムアウト制御)

#### 実装コード詳細

```typescript
// タイムアウト付きラッパー関数
export const withTimeout = <T>(
  promise: Promise<T>,
  ms: number,
  errorMessage = 'Operation timed out'
): Promise<T> => {
  let timeoutId: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
};
```

#### テスト・受入基準
- タイムアウト設定値を超えた処理がエラーとなること
- タイムアウト時のリソース解放が正常に行われること

#### ロールバック手順
- タイムアウト制御を削除し、無制限待機に戻す

---

### TASK-12: API レスポンスキャッシュ戦略

#### 課題と背景
- 頻繁にアクセスされる API エンドポイントでキャッシュが適用されていない
- レスポンスレイテンシの改善余地がある

#### 修正方針
1. ETag と条件付きリクエスト (If-None-Match) を実装する
2. キャッシュ制御ヘッダー (Cache-Control) を設定する
3. 動的コンテンツと静的コンテンツでキャッシュポリシーを分ける

#### 対象ファイル
- `packages/trpc/server/trpc.ts` (キャッシュミドルウェア)
- `packages/trpc/server/template-router/search-template.ts` (キャッシュ対象)

#### 実装コード詳細

```typescript
// キャッシュミドルウェア
export const cacheMiddleware = (ttlSeconds: number) => {
  return t.middleware(async ({ next, path, type }) => {
    if (type !== 'query') {
      return await next();
    }

    const start = Date.now();
    const result = await next();
    const duration = Date.now() - start;

    // レスポンスヘッダーにキャッシュ情報を追加
    // (実際の実装はトランスポート層に依存)

    return result;
  });
};
```

#### テスト・受入基準
- 2 回目以降の同一リクエストで 304 Not Modified が返されること
- キャッシュヒット時のレスポンス時間が 50% 以上短縮されること

#### ロールバック手順
- キャッシュヘッダーを削除し、常にフルレスポンスを返す

---

### TASK-13: セキュリティヘッダーの実装

#### 課題と背景
- CSP (Content Security Policy), HSTS, X-Frame-Options などのセキュリティヘッダーが未設定
- クリックジャッキングや XSS 攻撃への対策が不十分

#### 修正方針
1. レスポンスヘッダーにセキュリティヘッダーを追加する
2. CSP ポリシーを定義し、信頼済みソースのみを許可する
3. HSTS で HTTPS 接続を強制する

#### 対象ファイル
- `apps/remix/app/root.tsx` (レスポンスヘッダー設定)
- `packages/trpc/server/trpc.ts` (API レスポンスヘッダー)

#### 実装コード詳細

```typescript
// セキュリティヘッダー
export const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; frame-ancestors 'none';",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};
```

#### テスト・受入基準
- 全レスポンスにセキュリティヘッダーが含まれること
- CSP レポートエンドポイントが動作すること

#### ロールバック手順
- セキュリティヘッダーを削除する

---

### TASK-14: 署名プロセスの冗長化とフォールバック強化

#### 課題と背景
- 署名処理に失敗した場合のフォールバックが不十分
- TSA 障害時の処理は実装済みだが、署名サービス全体の冗長化がない

#### 修正方針
1. 署名サービスのマルチプロバイダー対応 (Google Cloud KMS + ローカル P12)
2. 署名失敗時の自動リトライ (指数バックオフ)
3. 署名状態の監視とアラート

#### 対象ファイル
- `packages/signing/index.ts` (リトライロジック追加)
- `packages/signing/helpers/tsa.ts` (サーキットブレーカー拡張)
- `packages/lib/server-only/document/signing.ts` (署名状態監視)

#### 実装コード詳細

```typescript
// 指数バックオフ付きリトライ
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> => {
  let lastError: unknown;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, i);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
};
```

#### テスト・受入基準
- 一時的なエラー時にリトライが成功すること
- リトライ回数を超えた場合にエラーが返されること
- 指数バックオフにより再試行間隔が適切に空くこと

#### ロールバック手順
- リトライロジックを削除し、単一試行に戻す

---

### TASK-15: ドキュメントと運用手順書の整備

#### 課題と背景
- 運用手順書が不十分
- トラブルシューティングガイドが存在しない

#### 修正方針
1. `docs/operations/` ディレクトリに運用手順書を作成する
2. トラブルシューティングガイドを整備する
3. 環境変数一覧とデプロイ手順を文書化する

#### 対象ファイル
- `docs/operations/deployment.md` (新規)
- `docs/operations/troubleshooting.md` (新規)
- `docs/operations/environment-variables.md` (新規)
- `README.md` (リンク追加)

#### テスト・受入基準
- 新規開発者がドキュメントのみで環境構築できること
- 一般的なエラーに対する解決策が記載されていること

#### ロールバック手順
- ドキュメントを削除する (運用影響なし)

---

## 6. 検証コマンド

各タスク完了後の検証コマンド：

```bash
# 型チェック
npx tsc --noEmit -p apps/remix/tsconfig.json

# 静的解析
npx biome check .

# ユニットテスト
npx vitest run

# E2E テスト (CI 環境)
npm run test:e2e

# ビルド
npm run build

# マイグレーション
npm run prisma:migrate-deploy
```

---

## 7. リスクと軽減策

| リスク | 影響度 | 軽減策 |
|--------|--------|--------|
| 既存機能のリグレッション | 高 | 各タスク完了後に既存テストを実行 |
| パフォーマンス劣化 | 中 | 変更前後のベンチマーク比較 |
| デプロイ失敗 | 高 | ステージング環境での事前検証 |
| セキュリティ脆弱性 | 高 | セキュリティ専門家によるレビュー |

---

## 8. スケジュール (目安)

| フェーズ | 期間 | タスク |
|----------|------|--------|
| Phase 1 | 週間 1-2 | TASK-01, TASK-02, TASK-03 |
| Phase 2 | 週間 3-5 | TASK-04, TASK-05, TASK-06, TASK-07 |
| Phase 3 | 週間 6-9 | TASK-08 ~ TASK-15 |

**総期間**: 約 9 週間

---

## 9. 承認フロー

1. テックリードによる計画承認
2. セキュリティチームによるセキュリティタスクのレビュー
3. ステークホルダーによるスケジュール承認
4. 各タスク完了後の PR レビューとマージ

---

**作成者**: Zoo (シニアソフトウェアエンジニア)  
**最終更新**: 2026-11-18