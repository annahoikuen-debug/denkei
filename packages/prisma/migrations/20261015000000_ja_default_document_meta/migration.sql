-- フェーズ1 ステップ3: DocumentMeta の既定 language / timezone を日本向けに変更
-- 方針: 既存レコードは変更しない(新規作成分のみ既定適用)。
--        そのため ALTER TABLE で DEFAULT のみ変更し、UPDATE は実行しない。
-- ロールバック: 下記の DEFAULT を元の値("en" / "Etc/UTC")に戻すことで復旧可能。

-- AlterTable
ALTER TABLE "DocumentMeta" ALTER COLUMN "language" SET DEFAULT 'ja';

-- AlterTable
ALTER TABLE "DocumentMeta" ALTER COLUMN "timezone" SET DEFAULT 'Asia/Tokyo';
