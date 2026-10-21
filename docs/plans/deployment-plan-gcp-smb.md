# デンケイ (Denkei) デプロイ計画書
## 日本法準拠・手離れゼロ（Google Cloud 主軸 / 初期0〜5ドル運用）

- **策定日**: 2026-10-19
- **対象バージョン**: Denkei (v1.2)
- **基本方針**:
  1. **日本法準拠**: 電子署名法（第2条・第3条）、電子帳簿保存法（真実性・検索性）、民法第522条に100%適合。
  2. **手離れゼロ（NoOps）**: サーバーOSパッチ当て・再起動・証明書更新などの保守作業を全廃（完全サーバーレス/マネージド構成）。
  3. **初期低コスト（0〜5ドル/月）**: 100ユーザー利用時でも月額約 $1.05（約160円）前後で運用可能。

---

## 1. システム構成アーキテクチャ

Google Cloud (GCP) の充実した無料枠とセキュアな暗号化モジュール (HSM) を核とし、サーバーレス PostgreSQL と高到達メール配信を組み合わせます。

```
[利用者 (ブラウザ・スマホ)] ──(HTTPS/443)──▶ [Google Cloud Run] (Denkei アプリコンテナ)
                                                    │
       ┌────────────────────────────────────────────┼────────────────────────────────────────────┐
       ▼                                            ▼                                            ▼
[Google Cloud KMS (HSM)]                 [Google Cloud Storage (GCS)]                 [Neon Serverless Postgres]
(電子署名法第3条準拠の署名鍵)            (S3互換・原本PDF保管)                        (自動バックアップ・PITR内蔵)
       │                                            │                                            │
       └────────────────────────────────────────────┼────────────────────────────────────────────┘
                                                    ▼
                                           [Resend (SMTP)]
                                    (署名依頼・OTP・完了通知メール配信)
```

---

## 2. サービス選定・コスト内訳（100ユーザー時）

| 役割 | 採用サービス | 想定利用量（100ユーザー時） | 月額費用 (USD) | 日本円換算 (約150円/$) | 手離れ・運用のポイント |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Web / API アプリ** | **Google Cloud Run** | 5万〜10万 リクエスト / 月 | **$0.00** | **0 円** | 無料枠内（月200万req、36万GB秒）。アクセスなし時はインスタンス数0。OS保守ゼロ。 |
| **原本ストレージ** | **Cloud Storage (Firebase Storage)** | PDF 100〜500件（約 500MB〜1GB） | **$0.00** | **0 円** | 無料枠内（5GB、下り1GB/日）。耐久性99.999999999%。S3互換HMACキーで接続。 |
| **電子署名鍵 (PAdES)** | **Google Cloud KMS (HSM)** | 鍵保管 1本 ＋ 署名 100〜500回 | **約 $1.05** | **約 160 円** | ハードウェア保護（HSM）。鍵紛失・漏洩・有効期限切れ事故を完全防止。 |
| **データベース** | **Neon (PostgreSQL)** | DB容量 約 50MB〜100MB | **$0.00** | **0 円** | 無料枠（0.5GB）。毎秒レベルの自動バックアップ（PITR）内蔵。運用保守不要。 |
| **メール送信 (SMTP)** | **Resend** | 月間 500〜800通 | **$0.00** | **0 円** | 無料枠（月3,000通 / 1日100通）。SPF/DKIM/DMARCが容易で不達トラブルなし。 |
| **合 計** | | | **約 $1.05 / 月** | **約 160 円 / 月** | 初期費用 0 円、月額約160円 |

> ※完全0円運用を希望する場合は、Google Cloud HSM の代わりにローカルP12証明書（`NEXT_PRIVATE_SIGNING_TRANSPORT=local`）を用いることで月額 0 円も可能です。
> ただし本番環境（`NODE_ENV=production`）では local トランスポートが禁止されているため、`NEXT_PRIVATE_SIGNING_ALLOW_LOCAL_IN_PRODUCTION=true` を併せて設定する必要があります。

---

## 3. 日本法への適合要件（エビデンス）

デンケイのコードベースが持つ法的防壁を最大限有効化します。

### ① 電子署名法（第2条・第3条）
- **HSMによる本人性担保**: `packages/signing/index.ts` の `gcloud-hsm` トランスポートを利用。秘密鍵がサーバー外部に露出・複製されることを物理的に防ぎます。
- **PAdES デジタル署名**: PDF 内部に改ざん検知署名（`ETSI.CAdES.detached` 相当）を直接埋め込み。

### ② 電子帳簿保存法（スキャナ保存・電子取引データ保存）
- **真実性の確保（ハッシュチェーン）**: `DocumentAuditLog` テーブルに格納されるログは直前のハッシュ値を引き継ぐ SHA-256 チェーン構造（`hash` / `prevHash`）になっており、DB管理者であっても事後改ざんが即座に露見します。
- **合意締結証明書**: 署名完了時に日時・IPアドレス・ユーザーエージェント・SHA-256ダイジェストを記録した証明書PDFを自動生成・同梱。
- **検索要件（施行規則第7条）**: 取引年月日、取引金額、取引先名でのメタデータ管理と CSV エクスポート機能を標準装備。

### ③ 民法（第522条・方式不要主義）
- 電磁的記録による契約の申込み・承諾フローを `jp-core-signing-flow` で厳密に担保。

---

## 4. デプロイ手順（手離れゼロ環境の構築）

### ステップ 1: 外部サービスの準備（初回のみ・所要時間 約15分）

1. **Google Cloud プロジェクト作成**:
   - GCP コンソールで新規プロジェクトを作成（例: `denkei-prod`）。
   - **Cloud KMS**: キーリング（東京 `asia-northeast1`）を作成し、非対称署名鍵（保護レベル: `HSM`、用途: `非対称署名`、アルゴリズム: `RSA 2048 - SHA256 PKCS#1`）を発行。
   - **Cloud Storage**: バケットを作成（例: `denkei-contracts`）。設定 >「相互運用性」から S3 互換の HMAC アクセスキーとシークレットキーを生成。
2. **Neon (PostgreSQL) 接続文字列取得**:
   - [Neon.tech](https://neon.tech) にて無料プロジェクトを作成し、接続文字列（`postgresql://...`）を取得。
3. **Resend (メール送信) 設定**:
   - [Resend.com](https://resend.com) で API キーを発行。自社ドメインの DNS（SPF/DKIM）を設定。

---

### ステップ 2: Cloud Run への環境変数設定

Cloud Run のコンテナ環境変数に以下を設定します：

```ini
# --- 基本設定 ---
NODE_ENV=production
PORT=8080
NEXT_PUBLIC_WEBAPP_URL=https://<あなたのドメインまたはCloud Runドメイン>
NEXTAUTH_URL=https://<あなたのドメインまたはCloud Runドメイン>
NEXTAUTH_SECRET=<openssl rand -hex 32 で生成>
NEXT_PRIVATE_ENCRYPTION_KEY=<openssl rand -hex 32 で生成>
NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY=<openssl rand -hex 32 で生成>

# --- 日本法・表示設定 ---
# UIロケールはブラウザの Accept-Language ヘッダから自動判定（jaブラウザなら日本語表示・fallback en）
NEXT_PRIVATE_SIGNING_REASON=電子署名法第2条および第3条に基づく電子契約締結
NEXT_PUBLIC_SIGNING_CONTACT_INFO=legal@yourcompany.com
NEXT_PUBLIC_SUPPORT_EMAIL=support@yourcompany.com

# --- 電子署名 (Google Cloud HSM: 月額約$1) ---
NEXT_PRIVATE_SIGNING_TRANSPORT=gcloud-hsm
NEXT_PRIVATE_SIGNING_GCLOUD_HSM_KEY_PATH=projects/denkei-prod/locations/asia-northeast1/keyRings/denkei-keyring/cryptoKeys/denkei-pades-signer/cryptoKeyVersions/1
# 証明書 (公開鍵) のBase64文字列またはSecret Managerパス
NEXT_PRIVATE_SIGNING_GCLOUD_HSM_PUBLIC_CRT_FILE_CONTENTS=<Base64化したCRT証明書文字列>
# サービスアカウント認証JSON (Cloud Runの実行サービスアカウントに「Cloud KMS CryptoKey Signer」権限を付与すれば不要)
# NEXT_PRIVATE_SIGNING_GCLOUD_APPLICATION_CREDENTIALS_CONTENTS=<Base64化したサービスアカウントJSON>

# --- PDFストレージ (Cloud Storage HMAC / S3互換) ---
NEXT_PUBLIC_UPLOAD_TRANSPORT=s3
NEXT_PRIVATE_UPLOAD_ENDPOINT=https://storage.googleapis.com
NEXT_PRIVATE_UPLOAD_REGION=auto
NEXT_PRIVATE_UPLOAD_BUCKET=denkei-contracts
NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID=<GCS HMAC Access Key>
NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY=<GCS HMAC Secret Key>

# --- データベース (Neon Serverless Postgres) ---
NEXT_PRIVATE_DATABASE_URL=postgresql://user:pass@ep-xyz-pooler.neon.tech/neondb?sslmode=require
NEXT_PRIVATE_DIRECT_DATABASE_URL=postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require

# --- メール配信 (Resend) ---
NEXT_PRIVATE_SMTP_TRANSPORT=smtp-auth
NEXT_PRIVATE_SMTP_HOST=smtp.resend.com
NEXT_PRIVATE_SMTP_PORT=465
NEXT_PRIVATE_SMTP_SECURE=true
NEXT_PRIVATE_SMTP_USERNAME=resend
NEXT_PRIVATE_SMTP_PASSWORD=<Resend API Key>
NEXT_PRIVATE_SMTP_FROM_NAME=デンケイ電子契約
NEXT_PRIVATE_SMTP_FROM_ADDRESS=contracts@yourcompany.com
```

---

### ステップ 3: ビルド・自動デプロイ

Cloud Run の GitHub 継続的デプロイ（Cloud Build 連携）を有効化し、`Dockerfile`（`docker/Dockerfile`）を指定してビルドします。

- **マイグレーション**: コンテナ起動スクリプト（`docker/start.sh`）内で `npx prisma migrate deploy` が自動実行されます。
- **推奨スペック・スケーリング設定**:
  - 最小インスタンス: `0`（完全無料運用・リクエスト時のみ起動）または `1`（コールドスタート数秒を嫌う場合・月額約$5）
  - 最大インスタンス: `5`
  - メモリ: **`2 GiB`** (推奨: Node.js/Remix + PDFレンダリング処理で1GiBだとOOMのリスクがあるため)
  - CPU: **`1 vCPU`** (第2世代実行環境)
  - リクエストタイムアウト: **`300秒`** (大きなPDFの署名や帳簿一括エクスポートを考慮)

---

## 5. 手離れ運用（日々の運用・メンテナンス）

1. **自動復旧・無停止更新**:
   - アプリケーション障害時は Cloud Run が自動で正常コンテナを再立ち上げ。
   - GitHub にコードを push すると、ローリングアップデートによりダウンタイムゼロで新バージョンへ移行。
2. **バックアップ・災害対策 (DR)**:
   - Neon が毎秒レベルの WAL ログ保存（PITR）を行っているため、誤操作時も過去の任意の時点へ1クリックで巻き戻し可能。
3. **死活監視（完全無料）**:
   - [UptimeRobot](https://uptimerobot.com) や [Better Stack](https://betterstack.com) 等の無料プランで `https://<ドメイン>/api/health` を 5分間隔でヘルスチェック設定。異常時のみメール/Slackへアラート通知。
4. **定期ジョブの確実実行（Cloud Scheduler・無料枠）**:
   - インスタンス最小数 0 運用では、署名リマインダー等の定期ジョブ（sweep）はインスタンス起動中しか動作しません。
   - Cloud Scheduler（月3ジョブまで無料）で `https://<ドメイン>/api/health` を 5分間隔で叩きインスタンスを確実に起床させることで、定期ジョブを約5分単位の精度で実行できます。
   - 役割分担: UptimeRobot＝異常時アラート、Cloud Scheduler＝定期起床。リマインダー時刻の厳密性が必要になった場合は、インスタンス最小数を `1` に変更（月額約$5）。

---

## 6. デプロイ実施 ToDo リスト（進捗チェックリスト）

### Phase 1: アカウント & 外部サービス準備
- [ ] **Google Cloud**
  - [ ] GCPプロジェクトの作成（課金有効化）
  - [ ] Cloud Run API、Cloud Build API、Cloud KMS API、Cloud Storage API を有効化
  - [ ] Cloud Storage（GCS）バケットを作成（`asia-northeast1`）
  - [ ] GCS の「相互運用性」から S3 互換 HMAC キー（Access Key / Secret Key）を発行
  - [ ] Cloud KMS でキーリングと非対称署名鍵（HSM / RSA 2048 SHA256）を作成
- [ ] **PostgreSQL (Neon)**
  - [ ] [Neon.tech](https://neon.tech) 無料アカウント作成＆プロジェクト作成
  - [ ] 接続文字列（Direct URL / Pooled URL）を取得して控える
- [ ] **メール配信 (Resend)**
  - [ ] [Resend.com](https://resend.com) 無料アカウント作成＆APIキー発行
  - [ ] 送信ドメイン（DKIM / SPF / DMARC）の DNS レコード設定・疎通確認
- [ ] **シークレット鍵の生成**
  - [ ] `NEXTAUTH_SECRET`、`NEXT_PRIVATE_ENCRYPTION_KEY`、`NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY` を生成（`openssl rand -hex 32`）

### Phase 2: Cloud Run サービス構築・デプロイ
- [ ] **GitHub 連携 / ビルド設定**
  - [ ] Cloud Run の「サービスの作成」から GitHub リポジトリ（denkei）を連携
  - [ ] ビルドタイプ: Dockerfile（パス: `docker/Dockerfile`）を指定
  - [ ] インスタンス構成（最小: 0、最大: 5、CPU: 1、メモリ: 2GiB）を設定
- [ ] **環境変数の登録**
  - [ ] 基本設定（`NODE_ENV=production`, `PORT=8080`, `NEXT_PUBLIC_WEBAPP_URL` 等）
  - [ ] 日本法・表示設定（`NEXT_PRIVATE_SIGNING_REASON`、`NEXT_PUBLIC_SIGNING_CONTACT_INFO` 等）
  - [ ] Google Cloud KMS 設定（`NEXT_PRIVATE_SIGNING_TRANSPORT=gcloud-hsm` 等）
  - [ ] GCS HMAC 設定（`NEXT_PUBLIC_UPLOAD_TRANSPORT=s3`、`NEXT_PRIVATE_UPLOAD_*` 等）
  - [ ] Neon DB 接続文字列
  - [ ] Resend SMTP 設定
- [ ] **初回デプロイ & データベース初期化**
  - [ ] 初回デプロイ実行（ビルド成功の確認）
  - [ ] `npx prisma migrate deploy` による DB マイグレーションの適用確認

### Phase 3: 動作検証（スモークテスト）
- [ ] **ヘルスチェック**: `https://<URL>/api/health` で 200 OK が返ることを確認
- [ ] **トップ・法務ページ表示**: LP および 利用規約（`/terms`）・プライバシーポリシー（`/privacy`）・特定商取引法に基づく表記（`/tokushoho`）の正常表示（特商法表記の運営者情報〈 〉の差し替え完了を含む）
- [ ] **アカウント作成・ログイン**: メール認証 / パスワードでの登録・ログイン確認
- [ ] **契約書作成 & 署名（日本法テスト）**:
  - [ ] PDF のアップロード（GCS への保存確認）
  - [ ] 署名者へのメール通知受領（Resend 経由の確認）
  - [ ] スマホ / PC からの署名完了（Cloud KMS による PAdES 電子署名の適用確認）
  - [ ] 締結完了メールおよび「合意締結証明書（SHA-256 ハッシュチェーン監査ログ）」のダウンロード・検証

### Phase 4: 独自ドメイン & 運用・監視設定
- [ ] **ドメイン設定**: 独自ドメイン（例: `contracts.example.com`）のマッピングと SSL 自動発行確認
- [ ] **死活監視（完全無料）**: UptimeRobot 等に `/api/health` を登録（5分間隔監視・異常時通知）
- [ ] **定期起床（Cloud Scheduler）**: 5分間隔で `https://<ドメイン>/api/health` へ HTTP ジョブを作成（署名リマインダー等の定期ジョブ確実実行）
- [ ] **バックアップ確認**: Neon ダッシュボードで自動バックアップ状態の確認

