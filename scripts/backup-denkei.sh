#!/usr/bin/env bash
# =============================================================================
# デンケイ (Denkei) 暗号化バックアップスクリプト (R-09)
#
# 概要:
#   1. PostgreSQL を pg_dump でダンプ (データベース内包ストレージのため PDF 実体も含む)
#   2. gzip 圧縮 + AES-256-CBC で暗号化 (バックアップには個人情報が含まれるため必須)
#   3. SHA-256 チェックサムを併記
#   4. 古い世代を自動削除 (BACKUP_KEEP_GENERATIONS)
#
# 使い方:
#   BACKUP_PASSPHRASE=$(cat /etc/denkei/backup-passphrase) \
#     ./scripts/backup-denkei.sh
#
#   cron 例 (毎日 3:30、アプリと DB が動いているホスト上で):
#     30 3 * * * cd /opt/denkei/denkei && \
#       BACKUP_PASSPHRASE=$(cat /etc/denkei/backup-passphrase) \
#       ./scripts/backup-denkei.sh >> /var/log/denkei-backup.log 2>&1
#
# リストア:
#   openssl enc -d -aes-256-cbc -pbkdf2 -in backup_<date>.sql.gz.enc \
#     -pass pass:"$BACKUP_PASSPHRASE" | gunzip | \
#     docker compose -f docker/compose.standalone.yml exec -T db \
#       psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
#
# 環境変数:
#   BACKUP_PASSPHRASE      必須。暗号化パスフレーズ (32文字以上を推奨)
#   BACKUP_DIR             保存先ディレクトリ (既定: /var/backups/denkei)
#   BACKUP_KEEP_GENERATIONS 保持する世代数 (既定: 14)
#
# 注意:
#   - docker/compose.standalone.yml と同じ .env を読み込むため、
#     スクリプトはリポジトリのルートから実行することを推奨する。
#   - 復元は必ず staging/ローカルで検証してから本番に適用すること
#     (OPERATIONS_MANUAL.md §17 の年次リストア訓練を参照)。
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

BACKUP_DIR="${BACKUP_DIR:-/var/backups/denkei}"
BACKUP_KEEP_GENERATIONS="${BACKUP_KEEP_GENERATIONS:-14}"
COMPOSE_FILE="docker/compose.standalone.yml"

# .env から POSTGRES_* を読み込む (スクリプト内でのみ展開、シェル環境へは出さない)
if [ -f "${REPO_ROOT}/.env" ]; then
  # shellcheck disable=SC1091
  set -a
  . "${REPO_ROOT}/.env"
  set +a
fi

: "${POSTGRES_USER:?POSTGRES_USER is required (set in .env)}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required (set in .env)}"
: "${POSTGRES_DB:?POSTGRES_DB is required (set in .env)}"

if [ -z "${BACKUP_PASSPHRASE:-}" ]; then
  echo "ERROR: BACKUP_PASSPHRASE is required (backup files contain personal data and must be encrypted)." >&2
  exit 1
fi

mkdir -p "${BACKUP_DIR}"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUTPUT_BASENAME="denkei_backup_${TIMESTAMP}"
OUTPUT_PATH="${BACKUP_DIR}/${OUTPUT_BASENAME}.sql.gz.enc"
CHECKSUM_PATH="${BACKUP_DIR}/${OUTPUT_BASENAME}.sql.gz.enc.sha256"

echo "[backup-denkei] Starting encrypted backup to ${OUTPUT_PATH}"

# 1. ダンプ + 圧縮 + 暗号化 (パイプラインで直接暗号化し、平文をディスクに置かない)
docker compose -f "${COMPOSE_FILE}" exec -T db \
  pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" \
  | gzip \
  | openssl enc -aes-256-cbc -pbkdf2 -salt -pass env:BACKUP_PASSPHRASE \
  > "${OUTPUT_PATH}"

# 2. 整合性チェックサム
sha256sum "${OUTPUT_PATH}" > "${CHECKSUM_PATH}"

# 3. 復号可能かを検証 (gzip ヘッダーが読めれば暗号化は破損していない)
if ! openssl enc -d -aes-256-cbc -pbkdf2 -pass env:BACKUP_PASSPHRASE \
  -in "${OUTPUT_PATH}" 2>/dev/null | gunzip -t; then
  echo "ERROR: Backup file failed decryption/integrity verification." >&2
  rm -f "${OUTPUT_PATH}" "${CHECKSUM_PATH}"
  exit 1
fi

# 4. 世代制限
GENERATION_COUNT=$(find "${BACKUP_DIR}" -name 'denkei_backup_*.sql.gz.enc' | wc -l)
if [ "${GENERATION_COUNT}" -gt "${BACKUP_KEEP_GENERATIONS}" ]; then
  # shellcheck disable=SC2012
  find "${BACKUP_DIR}" -name 'denkei_backup_*.sql.gz.enc' | sort | head -n "$((GENERATION_COUNT - BACKUP_KEEP_GENERATIONS))" | while read -r OLD_BACKUP; do
    rm -f "${OLD_BACKUP}" "${OLD_BACKUP}.sha256"
    echo "[backup-denkei] Removed old generation: ${OLD_BACKUP}"
  done
fi

FILE_SIZE=$(du -h "${OUTPUT_PATH}" | cut -f1)
echo "[backup-denkei] Backup complete: ${OUTPUT_PATH} (${FILE_SIZE})"
echo "[backup-denkei] Checksum: ${CHECKSUM_PATH}"
