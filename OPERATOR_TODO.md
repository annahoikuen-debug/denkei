# デンケイ 運用者 ToDo リスト (v1.0)

> 推奨構成実装(R-01〜R-11、`docs/plans/recommended-minimal-risk-implementation-plan.md` §13 実装記録)を受け、
> **運用者が今から順に実施すべき作業**をフェーズ別にまとめたチェックリストです。
> 各手順の詳細は `OPERATIONS_MANUAL.md` の該当セクションを参照してください。

---

## フェーズ1: 今すぐ(デプロイ前・30分)

- [ ] **1. `.env` の必須項目を埋める**
  今回の変更で `docker/compose.standalone.yml` は未設定だと起動しなくなりました(`:?err`)。
  ```bash
  # .env に以下を追加/確認(既存のスタンドアロン環境が起動しなくなるため最優先)
  POSTGRES_USER=documenso
  POSTGRES_PASSWORD=<強固なランダム文字列>   # openssl rand -hex 16
  POSTGRES_DB=documenso
  ```
  ⚠️ **既存DBのパスワードと一致させてください**(起動済みDBがある場合、`.env`のパスワードが正でないと認証失敗します)

- [ ] **2. 起動確認**: `docker compose -f docker/compose.standalone.yml up -d` → `http://localhost:3000/api/health` で `{"checks":{"database":"ok","certificate":"ok"}}` を確認
- [ ] **3. テレメトリ無効を確認**: compose 既定で `DOCUMENSO_DISABLE_TELEMETRY=true` が効いていること(`docker compose exec app env | grep TELEMETRY`)

## フェーズ2: 今週中(セキュリティ固定・1時間)

- [ ] **4. シークレットの見直し**: `NEXTAUTH_SECRET` / `NEXT_PRIVATE_ENCRYPTION_KEY` / `SECONDARY_KEY` が `.env.example` のサンプル値のままなら `openssl rand -hex 32` で再生成(**再生成で既存セッション無効化に注意**、初回デプロイ前なら今が最適)
- [ ] **5. サインアップ制限**(`.env`):
  ```bash
  NEXT_PUBLIC_DISABLE_SIGNUP=true              # 自社専用運用の場合
  # または部署ドメインのみ許可:
  # NEXT_PRIVATE_ALLOWED_SIGNUP_DOMAINS=example.co.jp
  ```
- [ ] **6. 本番公開面の確認**: リバースプロキシで HTTPS 化、`/api/health` 以外の直接公開が必要か見直し

## フェーズ3: 今週中(バックアップ自動化・1時間)

- [ ] **7. バックアップ用パスフレーズを作成**: `openssl rand -hex 32` → `/etc/denkei/backup-passphrase` に保存(権限600、**P12/.envと同じ場所に置かない**)
- [ ] **8. バックアップ手動テスト**:
  ```bash
  BACKUP_PASSPHRASE=$(cat /etc/denkei/backup-passphrase) ./scripts/backup-denkei.sh
  # → /var/backups/denkei/ に .sql.gz.enc + .sha256 が生成されることを確認
  ```
- [ ] **9. cron 登録**(毎日 3:30)+ オフサイトミラー(R2/S3)設定:
  ```
  30 3 * * * cd /opt/denkei/denkei && BACKUP_PASSPHRASE=$(cat /etc/denkei/backup-passphrase) ./scripts/backup-denkei.sh >> /var/log/denkei-backup.log 2>&1
  ```
- [ ] **10. リストア訓練を1回実施**(staging/ローカルで復号→psql リストア→起動確認。手順は OPERATIONS_MANUAL §11)

## フェーズ4: 今月中(保管期限の導入・2時間)

- [ ] **11. 保管期限を決定**(推奨 30〜90 日)
- [ ] **12. 規約・利用者案内を整備**(`assets/compliance/retention-policy-template.md` を自社用に編集→公開):
  - [ ] 「完了文書は N 日後にサーバーから削除」「電帳法の保存義務は利用者側」「監査記録は削除請求対象外」の3点が含まれていること
  - [ ] `USER_MANUAL.md` の該当注意書き(既に追記済み)と文言が一致していること
- [ ] **13. staging で挙動確認**: `NEXT_PRIVATE_ENVELOPE_RETENTION_DAYS=1` を設定→完了文書を翌日まで放置→PDFが消え、監査ログ照会とダウンロード時の 410 日本語メッセージを確認
- [ ] **14. 本番反映**: `.env` に本番値を設定→再起動→アプリログに `[JOBS]: Registered cron job internal.envelope-retention-sweep` を確認
- [ ] **15. 利用者へ周知**: 「完了文書は毎回ダウンロードして保存してください」(完了メールに締結証明書+監査ログPDF同梱は R-03 で自動化済み)

## フェーズ5: 今月中〜来月(署名鍵の HSM 移行・3〜4時間+GCP契約)

- [ ] **16. GCP 側の準備**(OPERATIONS_MANUAL §9 詳細手順):
  - [ ] Cloud KMS: key ring + 署名鍵(`EC_SIGN_P256_SHA256`、**破棄不可設定**、リージョン `asia-northeast1`)
  - [ ] 自社の組織証明書(PEM)を用意
  - [ ] サービスアカウント + `roles/cloudkms.signerVerifier` + JSON キー発行
- [ ] **17. staging で検証**: `.env` に `NEXT_PRIVATE_SIGNING_TRANSPORT=gcloud-hsm` + 鍵パス/証明書/認証情報を設定→テスト文書を完結→Acrobat で署名検証
- [ ] **18. 本番切り替え**(署名待ち PENDING=0 の時間帯): `.env` 更新→再起動→`/api/health` の certificate が `ok`→テスト署名1件
- [ ] **19. ロールバック手順を確認**(`.env` を戻して再起動のみで復旧可能なことを staging で一度試す)
- [ ] **20. HSM 移行後**: 旧 P12 を削除(マニュアル§9「旧構成」扱い)

> HSM 移行が間に合わない場合の暫定: P12 を chmod 600・有効期限をカレンダー登録・パスフレーズと分離保管(§9 R-11 項)

## フェーズ6: 継続運用(設定は1回・年間30分)

- [ ] **21. 外形監視**: UptimeRobot 等で `/api/health` を 1分間隔監視→Discord/Slack 通知(certificate が warning/error になったら検知)
- [ ] **22. NTP 確認**: `timedatectl` で `synchronized: yes`(TSAなし構成の時刻証明の基盤、OPERATIONS_MANUAL §13)
- [ ] **23. 年間リマインダーをカレンダー登録**(OPERATIONS_MANUAL §17.1):
  - [ ] 毎月1日: クラウド利用料 & Stripe 確認(10分)
  - [ ] 毎年5/20: OS・Docker パッチ(30分)
  - [ ] 毎年6/15: APIキー・証明書有効期限点検(20分)
  - [ ] 毎年9/10: 法令改正チェック(30分)
  - [ ] 毎年11/15: DBリストア訓練(30分)
  - [ ] 毎年12/20: 年末年始の無人運用確認(15分)
- [ ] **24. デプロイ運用の注意**: production compose は**ソースビルド**に変更済み(`documenso/documenso:latest` ではなくフォークコードをビルド)。デプロイは `git checkout <tag>` → `docker compose build` → `up -d` の順

---

## 進め方の要点

**最優先は 1〜3(起動できるようにする)→ 7〜10(バックアップ)→ 11〜15(保管期限)の順です。**
HSM(16〜20)は費用・契約の関係で後ろ倒し可ですが、P12 のまま運用する期間はフェーズ1のシークレット管理を厳格に。

## 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| `OPERATIONS_MANUAL.md` | 各手順の詳細(§9 署名鍵 / §11 バックアップ / §13 監視 / §15 チェックリスト / §17 年間予定表) |
| `assets/compliance/retention-policy-template.md` | 保管期限の規約文面テンプレート(フェーズ4 で使用) |
| `scripts/backup-denkei.sh` | 暗号化バックアップスクリプト(フェーズ3 で使用) |
| `docs/plans/recommended-minimal-risk-implementation-plan.md` | 実装計画書+実装完了記録(§13) |
| `USER_MANUAL.md` | 利用者向け案内(完了文書の自己保存について追記済み) |
