# デンケイ 運用者・デプロイヤー向けマニュアル (v1.0)

このマニュアルは、デンケイ（Denkei）を自社サーバーやクラウドにデプロイ・運用する管理者・運用者向けです。Docker によるセルフホスティング、環境変数設定、監視・バックアップ、アップグレード手順を解説します。

エンドユーザー向けの操作手順は `USER_MANUAL.md`、よくある質問は `Q&A.md` を参照してください。

---

## 目次

1. [デンケイの運用アーキテクチャ](#1-デンケイの運用アーキテクチャ)
2. [デプロイ構成の選択](#2-デプロイ構成の選択)
3. [スタンドアロン構成で起動（SMB低コスト）](#3-スタンドアロン構成で起動smb低コスト)
4. [本番構成で起動](#4-本番構成で起動)
5. [環境変数の完全リファレンス](#5-環境変数の完全リファレンス)
6. [電子署名証明書の設定](#6-電子署名証明書の設定)
7. [データベース管理・マイグレーション](#7-データベース管理マイグレーション)
8. [バックアップとリストア](#8-バックアップとリストア)
9. [アップグレード手順](#9-アップグレード手順)
10. [モニタリング・ヘルスチェック](#10-モニタリングヘルスチェック)
11. [トラブルシューティング](#11-トラブルシューティング)
12. [セキュリティ運用チェックリスト](#12-セキュリティ運用チェックリスト)

---

## 1. デンケイの運用アーキテクチャ

デンケイは Docker コンテナベースで動作するモノレポアプリケーションです。主要な構成要素は以下の通りです。

### 構成要素

| 要素 | 役割 | 推奨構成 |
|------|------|---------|
| アプリケーション | React Router v7 + Hono サーバー | Docker コンテナ (ポート3000) |
| データベース | PostgreSQL 15 | Docker コンテナ または 管理済みDB |
| ストレージ | アップロードファイル保存 | データベース内包 または S3互換 |
| メール送信 | 署名依頼・完了通知メール | SMTP / Resend / MailChannels / SES |
| ジョブキュー | 非同期処理（メール送信、文書シール等） | PostgreSQL 内蔵 (local) |
| 電子署名 | PDFへのPAdESデジタル署名 | P12ファイル (local) または Google Cloud HSM |

### 推奨最小構成（SMB Standalone）

外部 Redis・有料TSA・従量課金SMSを排除し、PostgreSQL 1台＋アプリ 1台で運用します。

- 契約あたり原価: 約 0.2〜0.5 円
- 月額目安: 2,980 円（月 100 契約）

---

## 2. デプロイ構成の選択

| 構成 | 用途 | ファイル | 特徴 |
|------|------|---------|------|
| スタンドアロン | 開発・中小企業本番 | `docker/compose.standalone.yml` | PostgreSQL + アプリ、外部依存なし |
| 本番 | 一般的な本番環境 | `docker/production/compose.yml` | 公式イメージ使用、外部DB想定 |
| 一クリック | クラウドプラットフォーム | デプロイボタン | Railway / Render / Koyeb / Elestio |

開発・検証用にはスタンドアロン構成を、本番運用には本番構成を推奨します。

---

## 3. スタンドアロン構成で起動（SMB低コスト）

### 前提条件

- Docker および Docker Compose がインストール済み
- 8 GB 以上のメモリ（推奨）
- ディスク空き容量 20 GB 以上

### 手順

#### 1. リポジトリをクローン

```bash
git clone https://github.com/annahoikuen-debug/denkei.git
cd denkei/denkei
git checkout v1.0
```

#### 2. 環境変数ファイルを作成

```bash
cp .env.example .env
```

`.env` を編集し、以下を必ず設定してください：

```bash
# 認証用シークレット（32文字以上のランダム文字列）
NEXTAUTH_SECRET="your-super-secret-key-32chars"

# 暗号化鍵（32文字以上）
NEXT_PRIVATE_ENCRYPTION_KEY="your-encryption-key-32chars"

# 二次暗号化鍵（32文字以上）
NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY="your-secondary-key-32chars"

# アプリ公開URL（本番ドメイン）
NEXT_PUBLIC_WEBAPP_URL="https://denkei.example.com"

# SMTP設定（メール送信用）
NEXT_PRIVATE_SMTP_HOST="smtp.example.com"
NEXT_PRIVATE_SMTP_PORT="587"
NEXT_PRIVATE_SMTP_USERNAME="your-smtp-user"
NEXT_PRIVATE_SMTP_PASSWORD="your-smtp-password"
NEXT_PRIVATE_SMTP_FROM_NAME="デンケイ 電子契約"
NEXT_PRIVATE_SMTP_FROM_ADDRESS="noreply@example.com"
```

#### 3. コンテナを起動

```bash
docker compose -f docker/compose.standalone.yml up -d
```

#### 4. 起動確認

```bash
docker compose -f docker/compose.standalone.yml logs -f app
```

正常に起動すると、`http://localhost:3000`（または `NEXT_PUBLIC_WEBAPP_URL`）でアプリケーションにアクセスできます。初回起動時に Prisma マイグレーションが自動適用されます。

### アクセスポイント

| サービス | URL | 説明 |
|---------|-----|------|
| メインアプリ | http://localhost:3000 | デンケイ本体 |
| データベース | localhost:5432 | PostgreSQL（コンテナ内） |

---

## 4. 本番構成で起動

公式 Docker イメージ `documenso/documenso:latest` を使用する構成です。

### 手順

#### 1. 環境変数ファイルを作成

```bash
cp .env.example .env
```

本番構成では以下が必須です（`production/compose.yml` で `:?err` チェックあり）：

- `NEXTAUTH_SECRET`
- `NEXT_PRIVATE_ENCRYPTION_KEY`
- `NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY`
- `NEXT_PUBLIC_WEBAPP_URL`
- `NEXT_PRIVATE_DATABASE_URL`
- `NEXT_PRIVATE_SMTP_TRANSPORT`
- `NEXT_PRIVATE_SMTP_FROM_NAME`
- `NEXT_PRIVATE_SMTP_FROM_ADDRESS`

#### 2. 署名証明書を配置（P12を使用する場合）

```bash
mkdir -p /opt/documenso
cp your-signing-certificate.p12 /opt/documenso/cert.p12
chmod 600 /opt/documenso/cert.p12
```

#### 3. コンテナを起動

```bash
docker compose -f docker/production/compose.yml up -d
```

---

## 5. 環境変数の完全リファレンス

### 必須設定

| 変数 | 説明 | デフォルト | 必須 |
|------|------|-----------|------|
| `NEXTAUTH_SECRET` | 認証セッション用シークレット | - | Yes |
| `NEXT_PRIVATE_ENCRYPTION_KEY` | データ暗号化プライマリ鍵 | - | Yes |
| `NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY` | データ暗号化セカンダリ鍵 | - | Yes |
| `NEXT_PUBLIC_WEBAPP_URL` | アプリ公開URL | - | Yes |
| `NEXT_PRIVATE_DATABASE_URL` | データベース接続URL | - | Yes |
| `NEXT_PRIVATE_SMTP_FROM_NAME` | 送信者名 | - | Yes |
| `NEXT_PRIVATE_SMTP_FROM_ADDRESS` | 送信メールアドレス | - | Yes |

### データベース

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `NEXT_PRIVATE_DIRECT_DATABASE_URL` | マイグレーション用直接DB URL | `NEXT_PRIVATE_DATABASE_URL` |
| `POSTGRES_USER` | DBユーザー名 | `denkei` |
| `POSTGRES_PASSWORD` | DBパスワード | `denkei_secure_password_123` |
| `POSTGRES_DB` | DB名 | `denkei` |

### サーバー

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `PORT` | サーバー待受ポート | `3000` |
| `NEXT_PUBLIC_BASE_PATH` | サブパス配信（例: /ESign） | 空 |

### ストレージ

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `NEXT_PUBLIC_UPLOAD_TRANSPORT` | ストレージプロバイダ | `database` |
| `NEXT_PRIVATE_UPLOAD_ENDPOINT` | S3エンドポイント | - |
| `NEXT_PRIVATE_UPLOAD_REGION` | S3リージョン | `us-east-1` |
| `NEXT_PRIVATE_UPLOAD_BUCKET` | S3バケット名 | - |
| `NEXT_PUBLIC_DOCUMENT_SIZE_UPLOAD_LIMIT` | アップロード制限MB | `5` |

### 電子署名

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `NEXT_PRIVATE_SIGNING_TRANSPORT` | 署名トランスポート | `local` |
| `NEXT_PRIVATE_SIGNING_LOCAL_FILE_PATH` | P12ファイルパス | `/opt/documenso/cert.p12` |
| `NEXT_PRIVATE_SIGNING_PASSPHRASE` | P12パスフレーズ | - |
| `NEXT_PRIVATE_SIGNING_ENABLE_TSA` | 外部TSA利用 | `false` |
| `NEXT_PRIVATE_SIGNING_TIMESTAMP_AUTHORITY` | TSA URL | - |
| `NEXT_PRIVATE_SIGNING_REASON` | 署名理由 | `Signed by Documenso` |
| `NEXT_PUBLIC_SIGNING_CONTACT_INFO` | 連絡先情報 | WebApp URL |
| `NEXT_PRIVATE_SIGNING_ALLOW_LOCAL_IN_PRODUCTION` | 本番でのP12許可フラグ | 未設定 |

### メール送信

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `NEXT_PRIVATE_SMTP_TRANSPORT` | メールプロバイダ | `smtp-auth` |
| `NEXT_PRIVATE_SMTP_HOST` | SMTPホスト | `127.0.0.1` |
| `NEXT_PRIVATE_SMTP_PORT` | SMTPポート | `2500` |
| `NEXT_PRIVATE_SMTP_USERNAME` | SMTPユーザー | `documenso` |
| `NEXT_PRIVATE_SMTP_PASSWORD` | SMTPパスワード | `password` |
| `NEXT_PRIVATE_RESEND_API_KEY` | Resend APIキー | - |
| `NEXT_PRIVATE_MAILCHANNELS_API_KEY` | MailChannels APIキー | - |

### 認証・本人確認

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `NEXT_PRIVATE_IDENTITY_PROVIDER` | 本人確認プロバイダ | `otp` |
| `NEXT_PUBLIC_DISABLE_SIGNUP` | 新規登録無効化 | - |
| `NEXT_PUBLIC_DISABLE_SIGNIN` | ログイン無効化 | - |
| `NEXT_PRIVATE_ALLOWED_SIGNUP_DOMAINS` | 許可ドメイン | - |
| `NEXT_PRIVATE_GOOGLE_CLIENT_ID` | Google OAuthクライアントID | - |
| `NEXT_PRIVATE_GOOGLE_CLIENT_SECRET` | Google OAuthクライアントシークレット | - |

### ジョブキュー

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `NEXT_PRIVATE_JOBS_PROVIDER` | ジョブプロバイダ | `local` |
| `NEXT_PRIVATE_REDIS_URL` | Redis URL (BullMQ用) | `redis://localhost:63790` |

### 請求・課金

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `NEXT_PUBLIC_FEATURE_BILLING_ENABLED` | 課金機能有効化 | - |
| `NEXT_PRIVATE_STRIPE_API_KEY` | Stripe APIキー | - |
| `NEXT_PRIVATE_STRIPE_WEBHOOK_SECRET` | Stripe Webhookシークレット | - |

### テレメトリー

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `DOCUMENSO_DISABLE_TELEMETRY` | テレメトリー無効化 | - |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHogキー | - |

---

## 6. 電子署名証明書の設定

デンケイはPDFにPAdES (ETSI.CAdES.detached) 形式で電子署名を行います。

### 証明書の種類

| トランスポート | 説明 | 用途 |
|--------------|------|------|
| `local` | P12ファイルによる署名 | 開発・セルフホスティングSMB |
| `gcloud-hsm` | Google Cloud KMSによる署名 | 本番・電子署名法厳格対応 |

### P12証明書の作成（OpenSSL）

```bash
# 秘密鍵と自己署名証明書を生成
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem \
    -days 3650 -nodes -subj "/C=JP/ST=Tokyo/L=Tokyo/O=Denkei/CN=denkei.example.com"

# P12形式に変換
openssl pkcs12 -export -out cert.p12 -inkey key.pem -in cert.pem \
    -name "Denkei Signing Certificate"

# パスフレーズ設定（対話形式で入力）
```

### 設定方法

```bash
# .env または Docker 環境変数
NEXT_PRIVATE_SIGNING_TRANSPORT=local
NEXT_PRIVATE_SIGNING_LOCAL_FILE_PATH=/opt/documenso/cert.p12
NEXT_PRIVATE_SIGNING_PASSPHRASE=your-p12-passphrase
```

Docker ボリュームでマウント：

```yaml
volumes:
  - /opt/documenso/cert.p12:/opt/documenso/cert.p12:ro
```

### 本番環境での注意

- 電子署名法第3条により、本番環境では `gcloud-hsm`（Google Cloud KMS）の使用が推奨されます。
- `local`（P12）を本番で使用する場合は `NEXT_PRIVATE_SIGNING_ALLOW_LOCAL_IN_PRODUCTION=true` の明示的なオプトインが必要です。

### 証明書状態確認

起動後、以下で証明書状態を確認できます：

```
http://<ホスト>:3000/api/certificate-status
```

---

## 7. データベース管理・マイグレーション

### マイグレーションの適用

Docker コンテナ起動時に自動適用されます。手動で適用する場合：

```bash
# スタンドアロン構成
docker compose -f docker/compose.standalone.yml exec app \
    npx prisma migrate deploy --schema ../../packages/prisma/schema.prisma

# またはホストから直接
npm run prisma:migrate-deploy
```

### 主なマイグレーション

| マイグレーション | 内容 |
|----------------|------|
| `20261015000000_ja_default_document_meta` | `DocumentMeta.language` の既定を `'ja'`、`timezone` の既定を `'Asia/Tokyo'` に変更 |
| `20261016000001_add_audit_log_worm_trigger` | `DocumentAuditLog` に WORM 保護トリガーを追加（UPDATE/DELETE禁止） |

### データベースGUI（Prisma Studio）

```bash
npm run prisma:studio
```

`http://localhost:5555` でデータベースを参照・編集できます。

### シードデータの投入

初期データ（デモ組織、サンプル文書等）を投入：

```bash
npm run prisma:seed
```

### スキーマの確認

```bash
npx prisma generate
```

---

## 8. バックアップとリストア

### データベースバックアップ

PostgreSQL の `pg_dump` を使用します。

```bash
# スタンドアロン構成のDBコンテナからバックアップ
docker compose -f docker/compose.standalone.yml exec db \
    pg_dump -U denkei denkei > backup_$(date +%Y%m%d).sql
```

### リストア

```bash
docker compose -f docker/compose.standalone.yml exec -T db \
    psql -U denkei -d denkei < backup_20261016.sql
```

### ボリュームバックアップ（スタンドアロン）

```bash
docker run --rm \
    -v denkei_data:/source:ro \
    -v $(pwd):/backup \
    alpine tar czf /backup/denkei_data_backup.tar.gz -C /source .
```

### バックアップ戦略

| 項目 | 推奨頻度 | 方法 |
|------|---------|------|
| データベース | 毎日 | pg_dump + オフサイト保存 |
| ボリュームデータ | 毎週 | Docker ボリュームバックアップ |
| 設定ファイル (.env) | 変更時 | Git 管理または秘密管理サービス |
| 署名証明書 (P12) | 作成時 | オフライン安全保管 |

---

## 9. アップグレード手順

### バージョン確認

```bash
git describe --tags
```

### アップグレード手順（Docker）

```bash
# 1. 最新コードを取得
git fetch origin
git checkout v1.x  # 対象バージョン

# 2. 環境変数を確認（新変数がある場合は .env を更新）
cp .env.example .env  # 参考にしつつ、既存値を保持

# 3. イメージを再ビルドまたはプル
docker compose -f docker/compose.standalone.yml pull

# 4. コンテナを再起動（マイグレーションは自動適用）
docker compose -f docker/compose.standalone.yml up -d

# 5. 起動確認
docker compose -f docker/compose.standalone.yml logs app
```

### アップグレード前の注意

- 必ずバックアップを取得してください。
- staging 環境で動作確認を行ってから本番に適用してください。
- Breaking Change がある場合は CHANGELOG またはリリースノートを確認してください。

---

## 10. モニタリング・ヘルスチェック

### ヘルスチェックエンドポイント

| エンドポイント | 説明 |
|--------------|------|
| `http://<ホスト>:3000/api/health` | アプリケーション稼働確認 |
| `http://<ホスト>:3000/api/certificate-status` | 署名証明書状態確認 |

### Docker ヘルスチェック

`compose.standalone.yml` の `db` サービスには `pg_isready` によるヘルスチェックが組み込まれています。

### ログ確認

```bash
# すべてのログ
docker compose -f docker/compose.standalone.yml logs

# アプリログのみ
docker compose -f docker/compose.standalone.yml logs app

# リアルタイムログ
docker compose -f docker/compose.standalone.yml logs -f app
```

### 推奨モニタリング項目

- コンテナ稼働状態（up / down）
- データベース接続エラー
- メール送信失敗率
- 署名処理失敗率
- ディスク使用量（アップロードファイル）

---

## 11. トラブルシューティング

### よくある問題と対処法

| 問題 | 原因 | 対処法 |
|------|------|--------|
| アプリが起動しない | 環境変数不足 | `.env` を確認し、必須変数を設定 |
| マイグレーションエラー | DB接続不可 | DBコンテナの起動待ち、接続URLを確認 |
| メールが届かない | SMTP設定誤り | SMTPホスト/ポート/認証情報を確認。開発時は `http://localhost:9000` (Inbucket) で確認 |
| 署名が機能しない | 証明書未設定 | P12ファイルパスとパスフレーズを確認。`/api/certificate-status` で状態確認 |
| アップロード失敗 | ファイルサイズ超過 | `NEXT_PUBLIC_DOCUMENT_SIZE_UPLOAD_LIMIT` を調整 |
| ログインできない | 認証設定誤り | `NEXTAUTH_SECRET` を確認。セッションクッキーを削除 |

### ログレベルの確認

```bash
# エラーログのみ抽出
docker compose -f docker/compose.standalone.yml logs app | grep -i error
```

---

## 12. セキュリティ運用チェックリスト

運用開始前に以下を確認してください：

- [ ] `NEXTAUTH_SECRET` を強固なランダム文字列に変更済み
- [ ] `NEXT_PRIVATE_ENCRYPTION_KEY` / `SECONDARY_KEY` を強固な文字列に変更済み
- [ ] `.env` ファイルのパーミッションを `600` など制限済み
- [ ] 本番環境で HTTPS を使用済み（リバースプロキシ等）
- [ ] データベースへのアクセスを内部ネットワークに制限済み
- [ ] 署名証明書（P12）を安全な場所に保管済み
- [ ] バックアップスケジュールを設定済み
- [ ] 不要なサインアップ方法を無効化済み（`NEXT_PUBLIC_DISABLE_*`）
- [ ] 電子署名法・電子帳簿保存法への対応状況を確認済み（`LEGAL_BASIS_JP.md` 参照）

---

## 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| `README.md` | プロジェクト概要・クイックスタート |
| `USER_MANUAL.md` | エンドユーザー向け操作マニュアル |
| `Q&A.md` | よくある質問と回答 |
| `ARCHITECTURE.md` | システムアーキテクチャ |
| `LEGAL_BASIS_JP.md` | 日本法における法的根拠 |
| `SECURITY.md` | セキュリティポリシー |
| `docker/README.md` | Docker セットアップ詳細 |

---

## サポート

- バグ報告・機能要望: [GitHub Issues](https://github.com/annahoikuen-debug/denkei/issues)
- セキュリティ脆弱性: [GitHub Security Advisories](https://github.com/annahoikuen-debug/denkei/security/advisories/new)
- エンタープライズサポート: README に記載のカレンダーからご相談ください
