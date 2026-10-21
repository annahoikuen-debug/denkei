-- R-03: 完了文書に監査ログPDFを既定で同梱する
-- 目的: 利用者が締結完了時に本文PDF+締結証明書+監査ログを受領し、
--       電子帳簿保存法の保存義務を利用者側で自己完結できるようにする。
--       これにより運用者側の長期保管責務を縮小できる(保管期限機能 R-01 とセット)。

-- 既定値を true に変更(新規組織向け)
ALTER TABLE "OrganisationGlobalSettings" ALTER COLUMN "includeAuditLog" SET DEFAULT true;

-- 既存の組織設定も true に統一する(意図的にオフにしている組織はない前提の SMB 単一運用向け)
UPDATE "OrganisationGlobalSettings" SET "includeAuditLog" = true WHERE "includeAuditLog" = false;
