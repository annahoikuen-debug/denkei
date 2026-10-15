# フェーズ3 ベースライン計測結果(ステップ1)

| 項目 | 内容 |
| --- | --- |
| 計測日 | 2026-10-15 |
| 環境 | Windows 11 / Node 24 / npm 11.19.1 |
| 前提 | フェーズ1・2 実装済み(ja UI・ウィザード・モバイル署名・OTP/Firebaseメール認証・アクセス制御・リマインダー・ダッシュボード) |

## フェーズ1〜3のリグレッション spec 一覧(フェーズ3で壊してはいけない)

| spec | フェーズ |
| --- | --- |
| `jp-core-signing-flow.spec.ts` | 1(コアフロー・日本語日時) |
| `jp-wizard-flow.spec.ts` | 1(3ステップウィザード) |
| `jp-mobile-signing.spec.ts` | 1(タッチ署名) |
| `jp-otp-auth.spec.ts` | 2(OTP認証) |
| `jp-access-control.spec.ts` | 2(アクセス制御) |
| `jp-reminder-expiry.spec.ts` | 2(リマインダー・期限) |
| `jp-dashboard.spec.ts` | 2(ダッシュボード) |
| 既存 `document-auth/*`, `envelope-*`, `templates-flow/*` 等 | 既存機能保護 |

## 実行結果サマリ

| チェック | 結果 | 備考 |
| --- | --- | --- |
| `npx tsc --noEmit`(remix) | ✅ 合格(0 エラー) | フェーズ2 実装後の確認済み |
| `node scripts/check-translations.mjs` | ✅ ja 翻訳漏れ 0 件 | 翻訳CI登録済み |
| E2E / Vitest | ⏸️ / ⚠️ | Docker(DB)前提 + ローカル Vitest 実行環境の既知問題(フェーズ1ベースライン参照)。CI 基準 |

## 既知の環境差分(フェーズ1から引き継ぎ)

1. Biome CRLF フォーマット差分(Windows checkout 起因)
2. `turbo build` の build.sh(cmd.exe 非対応)
3. Vitest ローカル実行の `vite-plugin-babel-macros` 互換問題

## フェーズ3での運用

- 各ステップの検証: `npx biome check <files>` + `npx tsc --noEmit` を最低ライン
- 削除系変更(Stage D)は「参照チェック(grep)」を必須化し、flag/ビルド除外で残置(物理削除は最終段階)
- マイグレーション(APPROVER ロール等)は追加のみで後方互換
