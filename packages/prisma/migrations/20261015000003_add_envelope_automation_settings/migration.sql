-- フェーズ3 ステップ1: テンプレート自動化設定(差し込み変数/署名順固定/承認設定)の保存先
-- 既存レコードは NULL(= 既定設定)のまま変更しない。

ALTER TABLE "Envelope" ADD COLUMN "automationSettings" JSONB;
