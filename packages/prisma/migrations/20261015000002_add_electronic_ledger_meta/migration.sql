-- フェーズ1 ステップ35: 電子帳簿保存法(検索要件)対応のメタデータ列を DocumentMeta に追加
-- 契約種別・取引先名・金額(円)・締結日。すべて任意(NULL 許可)で後方互換。

-- AlterTable
ALTER TABLE "DocumentMeta" ADD COLUMN "contractType" TEXT;
ALTER TABLE "DocumentMeta" ADD COLUMN "counterpartyName" TEXT;
ALTER TABLE "DocumentMeta" ADD COLUMN "contractAmount" INTEGER;
ALTER TABLE "DocumentMeta" ADD COLUMN "contractDate" TIMESTAMP(3);

-- AddIndex (検索要件対応: 取引先名・契約日での検索を想定)
CREATE INDEX "DocumentMeta_counterpartyName_idx" ON "DocumentMeta"("counterpartyName");
CREATE INDEX "DocumentMeta_contractDate_idx" ON "DocumentMeta"("contractDate");
