# フェーズ1 ベースライン計測結果(ステップ1)

| 項目 | 内容 |
| --- | --- |
| 計測日 | 2026-10-15 |
| 環境 | Windows 11 / Node 24 / npm 11.19.1 |
| 対象 | main 相当の現行ツリー(コミット時点) |

## 計測結果サマリ

| チェック | コマンド | 結果 | 備考 |
| --- | --- | --- | --- |
| 静的解析(Biome) | `npm run lint` | ❌ 失敗 | 失敗の大半は Windows の CRLF 改行に起因するフォーマット差分(`Formatter would have printed ...` + `␍`)。環境起因のためベースラインでは「既知の環境差分」として記録。コード実質エラーは今後のステップで改変したファイルのみ Biome チェックで担保する |
| 型チェック | `npx tsc --noEmit -p apps/remix/tsconfig.json` | ✅ 合格 | 事前準備として `prisma generate` と `react-router typegen` の実行が必要(生成物は gitignore 済み)。生成後は 0 エラー |
| E2E | `npm run test:e2e` | ⏸️ 未実行 | Docker( Postgres / Inbucket / Inngest )とシードデータが必要なため本環境では未実施。CI 上での実行を前提とする |

## 既知の失敗リスト

1. **Biome フォーマット差分(環境起因)**: Windows checkout により CRLF となったファイル全般が `format` エラーになる。`biome.json` での改行設定 or WSL/CI 実行で解消される想定。フェーズ1の実装では差分ファイルのみ注意。
2. **`apps/remix` の turbo build** が Windows で失敗(`./.bin/build.sh` はシェルスクリプトのため cmd.exe で実行不可)。CI(Linux)では動作する。ローカル検証は `react-router typegen` + `tsc --noEmit` を代替とする。

## 既知の失敗リスト(追記)

3. **Vitest 全スイート失敗(環境起因)**: `packages/lib` の Vitest 4.1.11 で全 19 スイートが `TypeError: Cannot read properties of undefined (reading 'config')` で失敗。既存テスト(`app.test.ts` 等)も同様のため、フェーズ1の変更とは無関係。`vite-plugin-babel-macros` と Vitest 4 / Vite の非互換が疑われる。CI(Linux)での結果を基準とする。ユニットテストの検証は CI 実行に委ねる。

## 前提コマンド(ローカルで型チェックする場合)

```bash
npm ci
npm run prisma:generate
cd apps/remix && npx react-router typegen
npx tsc --noEmit -p apps/remix/tsconfig.json
```

## 以降のステップでの運用

- 各ステップの検証は「変更ファイルに対する `npx biome check <files>`」+「`npx tsc --noEmit`」を最低ラインとする。
- E2E はステップ2以降で spec を作成し、CI 実行を前提に検証する。
