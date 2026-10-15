# フェーズ2 ベースライン計測結果(ステップ1)

| 項目 | 内容 |
| --- | --- |
| 計測日 | 2026-10-15 |
| 環境 | Windows 11 / Node 24 / npm 11.19.1 |
| 前提 | フェーズ1 実装済み(ja UI・ウィザード・タイムスタンプ・監査ログハッシュチェーン) |

## 既存認証フローの spec 一覧

フェーズ2で変更を加える署名認証系(ACCOUNT/PASSKEY/2FA/PASSWORD)に関わる既存 spec:

| spec | 対象 |
| --- | --- |
| `e2e/document-auth/access-auth.spec.ts` | アクセス認証 |
| `e2e/document-auth/action-auth.spec.ts` | アクション認証 |
| `e2e/document-auth/action-auth-password.spec.ts` | パスワードアクション認証 |
| `e2e/document-auth/assistant-signing-auth.spec.ts` | アシスタント署名認証 |
| `e2e/user/password.spec.ts` / `password-two-factor.spec.ts` | パスワード・2FA |
| `e2e/user/auth-flow.spec.ts` / `auth-sessions.spec.ts` | 認証フロー・セッション |
| `e2e/api/trpc/envelope/expired-recipient-field-signing.spec.ts` | 期限切れ recipient の署名 |
| `e2e/envelopes/envelope-expiration-*.spec.ts` | エンベロープ有効期限 |

## 実行結果サマリ

| チェック | 結果 | 備考 |
| --- | --- | --- |
| `npx tsc --noEmit -p apps/remix/tsconfig.json` | ✅ 合格 | フェーズ1 実装後(`react-router typegen` + `prisma generate` 実行済み) |
| E2E | ⏸️ 未実行 | Docker(DB/Inbucket/Inngest)前提のため本環境では未実施。CI 実行を基準とする |
| Vitest | ⚠️ 実行環境問題あり | フェーズ1ベースライン同様、ローカル環境で全スイートが `TypeError: Cannot read properties of undefined (reading 'config')` で失敗(既知の環境差分)。CI で検証 |

## 既知の失敗リスト(フェーズ1から引き継ぎ)

1. **Biome フォーマット差分(CRLF・環境起因)**: 詳細は [`phase1-baseline.md`](./phase1-baseline.md)
2. **turbo build の build.sh(cmd.exe 非対応)**: CI(Linux)では正常
3. **Vitest ローカル実行失敗(vite-plugin-babel-macros 互換)**: CI で検証

## フェーズ2での運用

- 各ステップの検証は「変更ファイルへの `npx biome check <files>`」+「`npx tsc --noEmit`」を最低ラインとする
- 認証系の E2E(OTP ゲート・レート制限)は CI 実行を前提に spec を作成する
- 後方互換必須: OTP 未設定の従来フロー・既存認証タイプ(ACCOUNT/PASSKEY/2FA/PASSWORD)を壊さないこと
