# 推奨構成 実装計画書 (Recommended Minimal-Risk Implementation Plan)

> **目的**: 「保管する情報は最低限」「運用者側のリスクは最小」という2要件を満たす推奨構成を実装する。
> **前提**: スタンドアロン構成 (`docker/compose.standalone.yml`) + 本番は HSM 移行。SMB 1〜3名運用を想定。
> **作成日**: 2026-10-20 / 対象バージョン: v1.1 系

---

## 0. スコープと作業項目一覧

| ID | 項目 | 区分 | 内容 | コード改修 |
|----|------|------|------|-----------|
| R-01 | 完了文書 保管期限ジョブ (B1) | 実装 | COMPLETED 後 N 日で PDF 実体・署名画像を自動破棄。監査ログ(ハッシュチェーン)は保持 | **あり(本体)** |
| R-02 | PDF 破棄後の縮退動作ガード (B1) | 実装 | 破棄済み文書のダウンロード/署名画面で日本語エラーを返す | **あり(本体)** |
| R-03 | 監査ログPDF・締結証明書の既定同梱 (C1) | 実装 | 組織既定で `includeAuditLog=true`。完了文書に証跡を同梱し利用者が自己保存できるようにする | **あり(小)** |
| R-04 | 保管・削除ポリシー文書 (C2) | ドキュメント | 利用規約向け文面テンプレ。WORM ログは削除請求対象外と明記 | なし |
| R-05 | テレメトリ無効化 (A1) | 設定 | compose 既定で `DOCUMENSO_DISABLE_TELEMETRY=true` | なし |
| R-06 | サインアップ制限の既定化 (A3) | 設定 | `.env.example` / マニュアルに `NEXT_PUBLIC_DISABLE_SIGNUP` を追記 | なし |
| R-07 | TSA 無効の根拠明文化 (D3) | ドキュメント | Q&A / OPERATIONS_MANUAL に時刻証明の代替根拠を追記 | なし |
| R-08 | DB 既定パスワードの必須化 (D4) | 設定 | compose の `POSTGRES_*` を `:?err` 必須化 | **あり(小)** |
| R-09 | バックアップ暗号化スクリプト (D5) | 実装 | `scripts/backup-denkei.sh`(暗号化+世代制限) | **あり(新規)** |
| R-10 | Google Cloud HSM 署名への移行 (D1) | 設定 | `gcloud-hsm` トランスポート設定手順+スモークテスト | なし(既存機能) |
| R-11 | P12 運用(移行期の暫定) (D2) | 運用 | HSM 切替までの鍵保管・ローテーション手順をマニュアル化 | なし |

**非スコープ** (将来フェーズ): 監査ログの IP/UA マスク(B2)、トークン類の定期掃除(B3)、レコード単位の匿名化。R-01 と同時に抱えると検証範囲が肥大化するため分割する。

---

## 1. R-01: 完了文書 保管期限ジョブ (本体実装)

### 1.1 設計方針

| 決定事項 | 採用案 | 理由 |
|----------|--------|------|
| 保管期限の指定方法 | 環境変数 `NEXT_PRIVATE_ENVELOPE_RETENTION_DAYS`(既定 `0`=無効) | 既存環境を壊さない。オプトイン方式で運用者が明示的に有効化 |
| 破棄対象 | `DocumentData.data` / `initialData`(PDF実体) + `Signature.signatureImageAsBase64`(署名画像) | PDF実体が保管量・PII の大半。監査ログ・メタ・宛先情報は残す |
| 破棄方法 | 行削除ではなく **データ内容の空化**(`data=''` を哨兵値とする) | FK 制約・UI 一覧表示を壊さない。スキーマ変更不要 |
| 実行タイミング | cron 日次(深夜 4 時台) | `cleanup-rate-limits.ts` と同じジョブ定義パターン |
| 監査証跡 | 破棄時に `DocumentAuditLog` へ 1 件追記(新タイプ `DOCUMENT_DATA_PURGED`) | WORM トリガーは UPDATE/DELETE 禁止で**追記は許可**(migration `20261016000001`)。ハッシュチェーンは継続 |
| バッチサイズ | 1 回 100 件まで | `expire-recipients-sweep.handler.ts:27` と同じ方針。残りは次回実行 |

### 1.2 対象ファイル一覧

| 区分 | ファイル | 変更内容 |
|------|---------|---------|
| 新規 | `packages/lib/universal/envelope-retention.ts` | 期限計算・環境変数パース(純粋関数) |
| 新規 | `packages/lib/universal/envelope-retention.test.ts` | 単体テスト |
| 新規 | `packages/lib/jobs/definitions/internal/envelope-retention-sweep.ts` | ジョブ定義 (cron `0 19 * * *` ※UTC 4時=JST 4時は `0 19 * * *`、運用者環境 TZ に依存するため実装時に確定) |
| 新規 | `packages/lib/jobs/definitions/internal/envelope-retention-sweep.handler.ts` | スイープ本体 |
| 新規 | `packages/lib/server-only/envelope/purge-envelope-data.ts` | 破棄トランザクション(server-only) |
| 新規 | `packages/lib/server-only/envelope/purge-envelope-data.test.ts` | DB 連成テスト(実行条件付き) |
| 編集 | `packages/lib/jobs/client.ts` | 定義の登録(import + 配列追加。`cleanup-rate-limits` と同様) |
| 編集 | `packages/lib/types/document-audit-logs.ts` | `DOCUMENT_DATA_PURGED` タイプ追加 |
| 編集 | `.env.example` / `docker/compose.standalone.yml` | `NEXT_PRIVATE_ENVELOPE_RETENTION_DAYS` 追記(コメント付き、既定 0) |

### 1.3 実装ステップ

**Step 1: 純粋関数 `packages/lib/universal/envelope-retention.ts`**

```typescript
export const parseEnvelopeRetentionDays = (raw: string | undefined): number => {
  // 未設定 / 不正値 / 0 → 0(無効)。負値は 0。1〜3650 にクランプ。
};

export const getRetentionCutoff = (now: Date, retentionDays: number): Date | null => {
  // retentionDays === 0 → null(無効)
  // otherwise: now - retentionDays 日
};

export const isEnvelopeExpired = (completedAt: Date, cutoff: Date): boolean =>
  completedAt < cutoff;
```

日時計算は `Asia/Tokyo` を考慮せず UTC 基準(期限が数時間ずれても実害なし。電帳法の時刻確定性は署名時刻で担保済み)。

**Step 2: 破棄処理 `packages/lib/server-only/envelope/purge-envelope-data.ts`**

```typescript
export const purgeExpiredEnvelopeData = async ({ cutoff, take = 100 }: {
  cutoff: Date;
  take?: number;
}) => {
  // 1. 対象抽出:
  //    Envelope where status = COMPLETED, updatedAt(=完了時刻の目安) < cutoff,
  //    envelopeItems: { some: { documentData: { data: { not: '' } } } }
  //    ※ 哨兵値 '' により「未破棄」を判定(スキーマ変更不要)
  // 2. 各 envelope について $transaction 内で:
  //    - EnvelopeItem.documentData.data / initialData → ''
  //    - Signature.signatureImageAsBase64 → null(対象 envelope の受取人に紐づく分)
  //    - DocumentAuditLog に DOCUMENT_DATA_PURGED を追記
  //      (user は system: { name: 'System', email: 'system@denkei.local' })
  // 3. 処理件数を返す(ログ用)
};
```

注意事項:
- `DocumentAuditLog` のハッシュチェーンは既存の追記フロー (`createDocumentAuditLogData`) を通すため `prevHash/hash` は自動計算される。**チェーン計算ユーティリティを迂回しないこと**。
- テンプレート (`type = TEMPLATE`) は対象外(期限が来ても破棄しない)。
- S3 トランスポート運用時は `deleteFile()` (`packages/lib/universal/upload/delete-file.ts`) を呼んで実体も削除。`database` トランスポート時は列の空化のみで良い(S3 の場合は data 列がパスのため)。

**Step 3: ジョブ定義 `envelope-retention-sweep.ts`**

`cleanup-rate-limits.ts` (packages/lib/jobs/definitions/internal/cleanup-rate-limits.ts:11-25) を雛形に:

```typescript
const ENVELOPE_RETENTION_SWEEP_JOB_DEFINITION_ID = 'internal.envelope-retention-sweep';
const ENVELOPE_RETENTION_SWEEP_JOB_DEFINITION_SCHEMA = z.object({});

// trigger.cron: '0 19 * * *' (UTC 19時 = JST 4時。日次)
// handler 内:
//   const days = parseEnvelopeRetentionDays(env('NEXT_PRIVATE_ENVELOPE_RETENTION_DAYS'));
//   if (days === 0) return; // 無効
//   const cutoff = getRetentionCutoff(new Date(), days);
//   await purgeExpiredEnvelopeData({ cutoff });
```

`packages/lib/jobs/client.ts` の定義配列に追加(27 行目・71 行目のパターンに従う)。local プロバイダは cron ポーラーを内蔵 (`local.ts:95-115`) のため追加コード不要。

**Step 4: 環境変数の配線**

- `.env.example`: `NEXT_PRIVATE_ENVELOPE_RETENTION_DAYS=0` を追加(コメント: `# 完了文書の保管期限(日)。0=無効。30〜90 を推奨`)
- `docker/compose.standalone.yml`: `${NEXT_PRIVATE_ENVELOPE_RETENTION_DAYS:-0}` を app の environment に追加

### 1.4 R-01 テスト計画(リグレッション防止)

**単体テスト `packages/lib/universal/envelope-retention.test.ts` (vitest)**

| テストケース | 入力 | 期待結果 |
|-------------|------|---------|
| 未設定 | `undefined` | `0`(無効) |
| 空文字 | `''` | `0`(無効) |
| 不正値 | `'abc'` | `0`(無効、throw しない) |
| 正常値 | `'30'` | `30` |
| 下限クランプ | `'-5'` | `0` |
| 上限クランプ | `'99999'` | `3650` |
| cutoff 計算 | `now=2026-10-20T00:00Z`, days=30 | `2026-09-20T00:00Z` |
| 無効時の cutoff | days=0 | `null` |

**DB 連成テスト `purge-envelope-data.test.ts` (実 DB、`NEXT_PRIVATE_DATABASE_URL` がある場合のみ実行・無ければ skip)**

| テストケース | 準備 | 期待結果 |
|-------------|------|---------|
| 期限超過文書のみ破棄 | COMPLETED を 2 件(期限切れ/期限内)作成 | 期限切れのみ `data=''`。期限内は無変更 |
| 署名画像の破棄 | 期限切れ文書に Signature を作成 | `signatureImageAsBase64` が null |
| 監査ログ追記 | 上記実行 | `DOCUMENT_DATA_PURGED` が 1 件追加 |
| ハッシュチェーン継続 | 上記実行 | 新ログの `prevHash` = 直前ログの `hash` |
| WORM トリガー非抵触 | 上記実行 | UPDATE/DELETE を試みた場合にのみ DB エラーとなること(追記は成功) |
| 再実行で冪等 | 同一対象を 2 回実行 | 2 回目の処理件数 0 |
| テンプレート保護 | type=TEMPLATE を作成 | 破棄されない |
| S3 トランスポート | type=S3_PATH の DocumentData | `deleteFile` 経由で S3 削除が呼ばれる(mock) |

**E2E テスト (Playwright) `packages/app-tests/e2e/retention-data-guard.spec.ts`**

ジョブ実行は E2E からトリガーできないため、E2E では **破棄済み状態を直接 DB で作り、縮退動作(R-02)を検証する**:

| シナリオ | 操作 | 検証 |
|---------|------|------|
| 破棄済み文書のダウンロード | 完了文書を作成 → DB で `DocumentData.data=''` に更新 → ダウンロード操作 | 日本語エラー(「保管期限を過ぎたため...」)が表示され、500 生エラーにならない |
| 一覧画面の表示 | 同上 | 文書一覧・詳細は正常表示(メタ情報は残存) |
| 期限内文書への影響なし | 通常の完了フロー既存テスト | 既存 `jp-core-signing-flow.spec.ts` 全 Green |

---

## 2. R-02: PDF 破棄後の縮退動作ガード

### 2.1 対象ファイル一覧

| 区分 | ファイル | 変更内容 |
|------|---------|---------|
| 編集 | `packages/lib/constants/error-codes.ts`(実在箇所に合わせる) | `DOCUMENT_DATA_PURGED` エラーコード追加 |
| 編集 | `apps/remix/server/api/download/download.ts` | `documentData.data` が空なら AppError を throw |
| 編集 | 完了文書のダウンロード系 server function(`packages/lib/server-only/envelope/get-envelope-by-id.ts` 系の PDF 取得箇所) | 同上 |
| 編集 | 翻訳 `apps/remix/locales/ja/web.po`(および `@documenso/email` 内の文言) | 日本語メッセージ追加 |

### 2.2 実装ステップ

1. エラーコード `DOCUMENT_DATA_PURGED` を追加(AppError パターンに従う)
2. PDF 取得ヘルパー(共通化されている場合は 1 箇所)にガードを追加:

```typescript
if (!documentData.data) {
  throw new AppError('DOCUMENT_DATA_PURGED');
  // ja: 「この文書は保管期限を過ぎたため、本文PDFは削除されました。
  //      締結証明書・監査ログは完了時に配信されています。監査記録は引き続き本システムで照会できます。」
}
```

3. UI(文書詳細)は監査ログ・メタデータを引き続き表示。削除済みPDFの再送・再ダウンロード導線は出さない

### 2.3 R-02 テスト計画

| 種別 | テスト | 検証内容 |
|------|--------|---------|
| E2E | 上記 §1.4 のシナリオ | エラー表示・画面縮退 |
| 単体 | AppError パーステスト | `AppError.parse(error)` でコードが取れる(既存パターン踏襲) |

---

## 3. R-03: 監査ログPDF・締結証明書の既定同梱 (C1)

### 3.1 対象ファイル一覧

| 区分 | ファイル | 変更内容 |
|------|---------|---------|
| 編集 | `packages/lib/utils/organisations.ts:128-129` | 既定 `includeAuditLog: false → true` |
| 編集 | `packages/prisma/schema.prisma:1023` | `OrganisationGlobalSettings.includeAuditLog` 既定 `false → true` |
| 新規 | `packages/prisma/migrations/20261020000000_default_include_audit_log/migration.sql` | 既存行を含め `true` へ UPDATE |
| 編集 | `packages/prisma/seed/`(該当 seed) | 既定値追従 |
| 編集 | `USER_MANUAL.md` / `Q&A.md` | 「完了文書に締結証明書・監査ログが同梱される」旨の追記 |

### 3.2 実装ステップ

1. schema の既定値変更 + マイグレーション:

```sql
ALTER TABLE "OrganisationGlobalSettings"
  ALTER COLUMN "includeAuditLog" SET DEFAULT true;
UPDATE "OrganisationGlobalSettings" SET "includeAuditLog" = true
  WHERE "includeAuditLog" = false;
```

2. `packages/lib/utils/organisations.ts` の既定オブジェクトも同時変更(新規組織用)
3. 既存組織で意図的にオフにしている場合の扱い: SMB 単一運用を想定し**全件 true へ統一**(個別オフ運用が存在する場合のみ UPDATE を除外)

### 3.3 R-03 テスト計画

| 種別 | テスト | 検証内容 |
|------|--------|---------|
| E2E(既存流用) | `jp-core-signing-flow.spec.ts` 完了フロー | 監査ログPDFが完成文書に結合される(`seal-document.handler.ts:208-275` の既存経路) |
| 単体 | 設定解決ユーティリティ(該当箇所) | 既定値 true が team 設定未指定時に使われる |
| マイグレーション検証 | 手動: `prisma migrate deploy` を staging で実行 | 既存行が true に更新される |

---

## 4. R-04: 保管・削除ポリシー文書 (C2)

### 4.1 対象ファイル

| 区分 | ファイル | 内容 |
|------|---------|------|
| 新規 | `assets/compliance/retention-policy-template.md` | 利用規約・プライバシーポリシー用の文面テンプレート(日本語) |
| 編集 | `OPERATIONS_MANUAL.md`(§11 付近に新設) | 運用者向け「保管期限の設定方法と法的位置づけ」 |

### 4.2 文面に含めるべき条項(要点)

1. **保管期間**: 完了文書の本文 PDF は締結完了から N 日後にシステムから削除される
2. **利用者の保存責任**: 電子帳簿保存法の保存義務は利用事業者側にある。完了時に配信される本文+締結証明書+監査ログを利用者が自己保管する
3. **監査記録の扱い**: 監査ログ(ハッシュチェーン含む)は改ざん防止記録であり、**個人情報の削除・利用停止請求の対象外**とする(個情法の例外規定を前提)
4. **削除後の照会**: 削除後も文書メタデータと監査記録は引き続き照会可能
5. **事前通知**: 保管期限の変更は事前に告知する

### 4.3 テスト計画

ドキュメントのみのため自動テストなし。レビュー基準: 上記 5 条項が網羅されていること、`NEXT_PRIVATE_ENVELOPE_RETENTION_DAYS` の既定値と文面の N が一致していること。

---

## 5. R-05〜R-07: 設定・ドキュメント系 (A1/A3/D3)

### 5.1 対象ファイル

| ID | ファイル | 変更 |
|----|---------|------|
| R-05 | `docker/compose.standalone.yml` | `- DOCUMENSO_DISABLE_TELEMETRY=true` を environment に追加 |
| R-05 | `.env.example:224-228` | `DOCUMENSO_DISABLE_TELEMETRY=true` を既定値化(コメントで PostHog 無効を明示) |
| R-06 | `.env.example` | `NEXT_PUBLIC_DISABLE_SIGNUP` / `NEXT_PRIVATE_ALLOWED_SIGNUP_DOMAINS` の使用例を追記 |
| R-06 | `OPERATIONS_MANUAL.md` §15 | チェックリストに「自社専用運用ではサインアップ無効化」を追加 |
| R-07 | `Q&A.md` | 「タイムスタンプ(外部TSA)なしで大丈夫か?」項目を新設。根拠: WORM+SHA-256 ハッシュチェーン (`DocumentAuditLog.prevHash/hash`)、締結証明書、サーバ時計同期(NTP)の運用を明記 |
| R-07 | `OPERATIONS_MANUAL.md` | NTP 時刻同期の確認手順を §13 に追記 |

### 5.2 テスト計画

| 種別 | テスト | 検証内容 |
|------|--------|---------|
| スクリプト | `npm run lint`(biome) | compose YAML 構文(YAML パースは `docker compose config` を手動実行) |
| 手動 | 起動後ログ確認 | `[JOBS]: Registered cron job` に既存ジョブのみ。テレメトリ関連警告なし |

---

## 6. R-08: DB 既定パスワードの必須化 (D4)

### 6.1 対象ファイル

| ファイル | 変更 |
|---------|------|
| `docker/compose.standalone.yml:8-10` | `${POSTGRES_PASSWORD:-denkei_secure_password_123}` → `${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required. Configure it in .env.}`(USER/DB も同様) |
| `.env.example` | `POSTGRES_USER/PASSWORD/DB` を明示的に追記(現状 document 依存) |
| `docker/compose.standalone.yml:34-35` | `NEXT_PRIVATE_DATABASE_URL` は `${POSTGRES_USER:?...}` 等を参照する形に統一 |

### 6.2 テスト計画

| 種別 | テスト | 検証内容 |
|------|--------|---------|
| 手動 | `.env` に `POSTGRES_PASSWORD` 未設定で `docker compose config` | 「POSTGRES_PASSWORD is required」で失敗すること |
| E2E(既存) | 開発環境起動 | `.env.example` 由来の dev 値で起動・全 E2E Green |

---

## 7. R-09: バックアップ暗号化スクリプト (D5)

### 7.1 対象ファイル

| 区分 | ファイル | 内容 |
|------|---------|------|
| 新規 | `scripts/backup-denkei.sh` | pg_dump → gzip → 暗号化 → 世代制限 |
| 編集 | `OPERATIONS_MANUAL.md` §11 | スクリプト利用手順・cron 設定例に置換 |

### 7.2 実装仕様

```bash
# 概要(擬似コード):
# 1. docker compose -f docker/compose.standalone.yml exec -T db \
#      pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip
# 2. 暗号化: age(推奨、鍵1本) または openssl enc -aes-256-cbc -pbkdf2
#    鍵は BACKUP_PASSPHRASE 環境変数(シェルに置かない、ファイル権限600)
# 3. 保存先: BACKUP_DIR(既定 /var/backups/denkei)
# 4. 世代制限: BACKUP_KEEP_GENERATIONS(既定 14)を超えた古い世代を削除
# 5. 整合性: 暗号化前に sha256sum を併記
# 6. 終了コード: 失敗時非ゼロ(cron での検知用)
```

設計上の注意:
- **バックアップに PII が含まれる**ため暗号化必須。世代数は最小限(既定 14 日)にして保管量自体も制御
- ボリュームバックアップ(`denkei_data`)は DB 内包 PDF を含むため、R-01 有効化後は DB バックアップで代替可能。ボリュームバックアップは証明書(P12)保管用途に限定して案内を修正

### 7.3 テスト計画

| 種別 | テスト | 検証内容 |
|------|--------|---------|
| 手動(実装時) | スクリプト実行 → 暗号化ファイル生成・復号 → `psql` リストア | 復元成功・行数一致 |
| 運用(既存) | OPERATIONS_MANUAL §17 の年次リストア訓練(11月)に本スクリプトを組み込む | — |
| 静的検査 | `bash -n scripts/backup-denkei.sh`(構文チェック) | エラーなし |

---

## 8. R-10: Google Cloud HSM 署名への移行 (D1)

既存実装 `packages/signing/transports/google-cloud.ts` を利用するため**コード改修不要**。設定と検証のみ。

### 8.1 設定手順(GCP 側)

1. Cloud KMS で key ring + 鍵を作成(署名用: `EC_SIGN_P256_SHA256` または RSA2048/SHA256、**破棄不可設定**)
2. 証明書: 自社の組織証明書(または取得した SSL/コードサイニング類)を用意。**秘密鍵は KMS に置かれ、証明書は env で渡す**(`google-cloud.ts:5-44`)
3. サービスアカウント作成 → ロール `roles/cloudkms.signerVerifier` 付与 → JSON キー発行
4. `.env` 設定:

```bash
NEXT_PRIVATE_SIGNING_TRANSPORT="gcloud-hsm"
NEXT_PRIVATE_SIGNING_GCLOUD_HSM_KEY_PATH="projects/<proj>/locations/asia-northeast1/keyRings/<ring>/cryptoKeys/<key>/cryptoKeyVersions/1"
NEXT_PRIVATE_SIGNING_GCLOUD_HSM_PUBLIC_CRT_FILE_CONTENTS="<base64 of PEM>"
# サーバレス/コンテナ向け: 認証情報を base64 で渡す(ファイル不要)
NEXT_PRIVATE_SIGNING_GCLOUD_APPLICATION_CREDENTIALS_CONTENTS="<base64 of service-account.json>"
```

5. `docker/production/compose.yml` / `compose.standalone.yml` の環境変数配線を追記(変数透過)
6. リージョンは `asia-northeast1`(個情法第28条: 国内リージョン推奨、`LEGAL_BASIS_JP.md` §実運用上の注意点)

### 8.2 移行手順(ダウンタイム最小)

1. staging で HSM 構成を検証(§8.3 スモークテスト)
2. 署名待ち(PENDING)文書が 0 件の時間帯を選択
3. `.env` の `NEXT_PRIVATE_SIGNING_TRANSPORT` を `local → gcloud-hsm` に変更して再起動
4. `/api/health` の `checks.certificate` が `ok` であることを確認(`apps/remix/app/routes/api+/health.ts:25-30` が既存の状態確認経路)
5. テスト文書 1 件を署名 → PDF の署名検証(Adobe Acrobat 等で署名者・改ざん検知を確認)
6. ロールバック手順: `.env` を元に戻して再起動のみ(データ形式の互換性問題なし。過去文書は既に署名済み)

### 8.3 R-10 テスト計画

| 種別 | テスト | 検証内容 |
|------|--------|---------|
| スモーク(自動) | `npm run test:e2e` の署名フロー群(`jp-core-signing-flow` / `jp-mobile-signing`)を staging で HSM 構成付き実行 | 署名が完了し締結証明書が生成される |
| スモーク(手動) | Acrobat で署名 PDF 検証 | 署名有効・改ざん検知 OK・証明書チェーン表示 |
| 単体(既存) | `packages/signing` の既存テスト | Green 維持 |
| 構成テスト | `NEXT_PRIVATE_SIGNING_TRANSPORT=gcloud-hsm` で鍵パス誤りの場合 | 起動はし、`/api/health` の `certificate` が `error` になること(サイレント障害にならない) |

### 8.4 R-11: 移行期の P12 運用(暫定)

`OPERATIONS_MANUAL.md` §9 に追記: P12 は `/opt/documenso` 配下 600 権限・有効期限カレンダー登録(§17.1 の 6月15日点検に追従)・紛失/漏洩時は証明書失効+全完了文書の再検証。HSM 移行完了をもって本項は「旧構成」として注記。

---

## 9. 実装スケジュール(推定)

| フェーズ | 作業 | 見積工数 |
|---------|------|---------|
| Phase 1 | R-05/R-06/R-07/R-08(設定・compose・ドキュメント) | 2〜3 時間 |
| Phase 1 | R-04 ポリシー文書 | 1〜2 時間 |
| Phase 2 | R-01 Step 1(純粋関数+単体テスト) | 2 時間 |
| Phase 2 | R-01 Step 2-3(ジョブ+破棄処理+DB テスト) | 4〜6 時間 |
| Phase 2 | R-02(縮退ガード+E2E) | 3〜4 時間 |
| Phase 3 | R-03(既定同梱+マイグレーション) | 1〜2 時間 |
| Phase 3 | R-09 バックアップスクリプト | 2〜3 時間 |
| Phase 4 | R-10 HSM 移行(GCP 設定含む)+スモーク | 3〜4 時間(+GCP 契約) |
| Phase 4 | 全リグレッション実行・`OPERATIONS_MANUAL` 全体見直し | 2 時間 |

**推奨リリース順**: Phase 1 → 3(R-03 は先行可・低リスク) → 2(R-01/R-02 は本体) → 4(R-10 は運用窓口と相談)。

---

## 10. リグレッション防止テスト総括表

| テスト | 種別 | 対象 | 実行コマンド |
|--------|------|------|-------------|
| `envelope-retention.test.ts` | 単体(新規) | R-01 期限計算 | `npm run test -w @documenso/lib` |
| `purge-envelope-data.test.ts` | 連成(新規・条件付き実行) | R-01 破棄・チェーン・冪等 | 同上(DB 起動時のみ) |
| `retention-data-guard.spec.ts` | E2E(新規) | R-02 縮退動作 | `npm run test:e2e` |
| `jp-core-signing-flow.spec.ts` | E2E(既存) | 署名フロー全体・証明書同梱 | `npm run test:e2e` |
| `jp-wizard-flow` / `jp-mobile-signing` | E2E(既存) | 日本語UX回帰 | `npm run test:e2e` |
| `security-app-banner-xss.spec.ts` | E2E(既存) | S-01 回帰なし | `npm run test:e2e` |
| `sanitize-banner-content.test.ts` ほか既存単体 | 単体(既存) | 既存機能回帰 | `npm run test -w @documenso/lib` |
| `bash -n` + `docker compose config` | 静的 | compose・スクリプト構文 | 手動/CI ステップ |
| HSM スモーク | 手動+staging E2E | R-10 | §8.3 |

**全 E2E は `.env` に `NEXT_PRIVATE_ENVELOPE_RETENTION_DAYS=0`(既定)で実行する**(既定無効のため既存テストに影響を与えない)。期限有効時の挙動は新規 spec 内で環境変数を明示的に設定して検証する。

---

## 11. 受入基準 (Definition of Done)

1. `NEXT_PRIVATE_ENVELOPE_RETENTION_DAYS` 未設定時、**既存挙動が 1 文字も変わらない**(既存 E2E 全 Green)
2. 期限設定時、COMPLETED 文書の PDF 実体・署名画像が自動破棄され、監査ログ(ハッシュチェーン)は完全に保持される
3. 破棄済み文書のダウンロードは日本語 AppError で縮退し、一覧・監査ログ照会は正常動作する
4. 完了文書に締結証明書+監査ログが既定で同梱される(新規組織)
5. compose の DB パスワードにフォールバック値が存在しない
6. テレメトリが既定で無効化されている
7. バックアップが暗号化+世代制限付きで自動化される
8. 本番構成で gcloud-hsm による署名が成功し、`/api/health` が `ok` を返す
9. `npm run lint` / `npx tsc --noEmit` / 既存全単体・E2E テストが Green
10. `OPERATIONS_MANUAL.md`・`Q&A.md`・ポリシー文書が実装と整合している

---

## 12. 実行コマンド(参考)

```bash
# 型チェック(対象パッケージ)
npx tsc --noEmit -p packages/lib/tsconfig.json

# 単体テスト
npm run test -w @documenso/lib

# E2E(全件)
npm run test:e2e

# 単一 E2E を dev モードで
npm run test:dev -w @documenso/app-tests

# マイグレーション検証(staging)
npx prisma migrate deploy --schema packages/prisma/schema.prisma

# compose 構文検証
docker compose -f docker/compose.standalone.yml config

# lint / format
npm run lint
npm run format
```

---

## 関連ドキュメント

| ドキュメント | 関係 |
|-------------|------|
| `docs/plans/security-remediation-plan.md` | S-01〜S-03 の先行修正が前提(S-02 は `.env.example` を共有) |
| `OPERATIONS_MANUAL.md` | §9/§11/§13/§15/§17 を更新 |
| `LEGAL_BASIS_JP.md` | 保管期限ポリシーと電帳法の責務分割の根拠 |
| `docker/README.md` | Lean Profile の環境変数一覧に新変数を追記 |

---

## 13. 実装完了記録 (2026-10-20)

### 実装済み

| ID | 状態 | 実装内容 |
|----|------|---------|
| R-01 | ✅ | `packages/lib/universal/envelope-retention.ts`(純粋関数) / `packages/lib/server-only/envelope/purge-envelope-data.ts`(破棄処理) / `packages/lib/jobs/definitions/internal/envelope-retention-sweep.ts`(+handler, cron `0 19 * * *`) / `client.ts` 登録 / compose・`.env.example` 配線。監査ログは **create 前にハッシュ計算し 1 回で書き込む**(WORM トリガーと prisma 拡張の immutable レイヤーが UPDATE を禁止するため計画から方式変更)。jsonb のキー順序正規化(`normalizeForJsonb`)により DB 往復後もハッシュ検証が成立 |
| R-02 | ✅ | エラーコード `DOCUMENT_DATA_PURGED`(HTTP 410) + `files.helpers.ts` / `files.ts`(全 token・session 経路に try/catch) / `get-envelope-item-pdf.ts` のガード。`app-error-ja.ts` に日本語メッセージ登録 |
| R-03 | ✅ | `OrganisationGlobalSettings.includeAuditLog` 既定 `true` + マイグレーション `20261020000000_default_include_audit_log`(既存行も true に更新) + `organisations.ts` 既定オブジェクト |
| R-04 | ✅ | `assets/compliance/retention-policy-template.md` 作成 |
| R-05 | ✅ | compose(standalone/production) に `DOCUMENSO_DISABLE_TELEMETRY=true` |
| R-06 | ✅ | `OPERATIONS_MANUAL.md` §15 チェックリストに追加 |
| R-07 | ✅ | `Q&A.md` Q23 拡張(証跡 4 点の表) + OPERATIONS_MANUAL §13 に NTP 確認手順 |
| R-08 | ✅ | standalone compose の `POSTGRES_*` を `:?err` 必須化、DB URL も必須変数参照に統一。production compose に `NEXT_PRIVATE_SIGNING_*`(gcloud-hsm 群) + retention + telemetry の透過を追加し、**フォーク機能を含むため upstream イメージからソースビルドに変更** |
| R-09 | ✅ | `scripts/backup-denkei.sh`(AES-256-CBC 暗号化・SHA-256・復号検証・世代制限) + OPERATIONS_MANUAL §11 改訂 |
| R-10 | ✅ | OPERATIONS_MANUAL §9 に GCP KMS 設定・移行手順・スモークテスト表を追加(GCP 側作業は運用者実施) |
| R-11 | ✅ | OPERATIONS_MANUAL §9 に P12 暫定運用を追加。証明書状態確認は `/api/health` に修正(旧 `/api/certificate-status` は存在しない) |

### テスト実績

| テスト | 結果 |
|--------|------|
| `envelope-retention.test.ts`(単体) | 15/15 passed |
| `purge-envelope-data.test.ts`(DB 連成・開発DB 54320 起動時) | 7/7 passed |
| `retention-data-guard.spec.ts`(E2E) | passed(410 + 日本語メッセージ + 正常文書無影響) |
| `jp-core-signing-flow.spec.ts`(E2E) | 3/3 passed |
| `include-document-certificate.spec.ts`(E2E) | 4/4 passed(R-03 の監査ログ同梱を反映した期待値に更新) |
| `@documenso/lib` 全単体テスト | 547 passed / 0 failed |
| `tsc --noEmit`(remix) | 0 error(lib は既存 8 件のみ・本実装対象外ファイル) |
| `biome check`(変更ファイル) | error 0 |

### 実装中に発見・修正した既存不具合

1. **クライアントでの `process is not defined` クラッシュ**(`feature-flags.ts` `extractPostHogConfig`):
   クライアントバンドルが生の `process.env` を参照し、ErrorBoundary が二重クラッシュして元エラーが隠蔽される。
   テレメトリ無効(R-05 の `NEXT_PUBLIC_POSTHOG_KEY=""`)構成で顕在化。`env()` ヘルパー(window.__ENV__)経由に修正。
2. **ハッシュチェーン書き込み方式**(`otp-audit-logs.ts` / `approval-flow.ts` は未修正・既存のまま):
   create 後に UPDATE で hash を書く方式は WORM トリガー・prisma 拡張の両方で拒否される。
   R-01 では create 前計算方式を採用。既存 2 箇所は将来修正推奨。
3. **既存 E2E のラベル逸脱**( jp-core-signing-flow / include-document-certificate ):
   ja マイグレーション以降の新規 DB では完了ダイアログが「合意して電子認印を押印する」になるため
   `name: 'Sign'` 固定の selector を両言語対応に修正。加えて luxon の `DateTime` import 漏れを修正。
4. **既存のテスト/シード不整合(未修正・既存のまま)**: `jp-wizard-flow.spec.ts` はチーム slug `personal` を前提とするが
   現行シードは `personal_<id>` を生成するため失敗する。本実装の対象外。
