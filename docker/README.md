# Docker Setup for Denkei (デンケイ) / Documenso

## 🇯🇵 デンケイ 中小企業特化・単一コンテナ起動（SMB Standalone Lean Setup）

デンケイは、外部Redis・有料TSA・従量課金SMSなどの不要な重厚依存を排除し、**PostgreSQL 1台 ＋ アプリケーション 1台**のみで最小限のリソースで稼働します。

### クイックスタート (ワンコマンド起動)

```bash
# 1. リポジトリ直下でスタンドアロン設定を起動
docker compose -f docker/compose.standalone.yml up -d

# 2. ログ確認
docker compose -f docker/compose.standalone.yml logs -f app
```

起動後、自動的に Prisma マイグレーションが適用され、`http://localhost:3000` で稼働を開始します。

### 特徴（SMB低原価アーキテクチャ）
- **ジョブキュー**: PostgreSQL内蔵バックグラウンドジョブ（Redis不要）
- **タイムスタンプ**: 電帳法WORM監査ログ＋SHA-256ハッシュチェーン（外部TSA費用 0円）
- **本人確認**: メールワンタイムパスワード（SMS送信費 0円）
- **ストレージ**: PostgreSQLデータベース内包 または Cloudflare R2 / AWS S3

---

## 📚 Reference & Upstream Guides

- [Docker Deployment](https://docs.documenso.com/docs/self-hosting/deployment/docker) — Standalone container with an external database
- [Docker Compose Deployment](https://docs.documenso.com/docs/self-hosting/deployment/docker-compose) — Production setup with PostgreSQL included
- [Environment Variables](https://docs.documenso.com/docs/self-hosting/configuration/environment) — Full configuration reference
- [Signing Certificate](https://docs.documenso.com/docs/self-hosting/configuration/signing-certificate) — Set up document signing

