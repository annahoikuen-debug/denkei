-- フェーズ1 ステップ32: DocumentAuditLog にハッシュチェーン列を追加
-- 電子帳簿保存法(真実性)対応: prevHash / hash で改変検知可能なチェーンを構築する。
-- 既存レコードは NULL のまま残し、バックフィルスクリプト(scripts/backfill-audit-log-hash.mjs)で遡及計算する。
-- ロールバック: 列を残したままコードを前バージョンへ戻すことで復旧可能(後方互換)。

-- AlterTable
ALTER TABLE "DocumentAuditLog" ADD COLUMN "prevHash" TEXT;
ALTER TABLE "DocumentAuditLog" ADD COLUMN "hash" TEXT;
