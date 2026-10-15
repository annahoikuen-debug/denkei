-- フェーズ2 ステップ3: 署名者本人確認(メールOTP/Firebaseメール認証)の一時検証トークン
-- 既存レコードへの影響なし(新規テーブルのみ・追加のみで後方互換)。

-- CreateTable
CREATE TABLE "RecipientVerificationToken" (
    "id" TEXT NOT NULL,
    "recipientId" INTEGER NOT NULL,
    "authType" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "RecipientVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecipientVerificationToken_recipientId_idx" ON "RecipientVerificationToken"("recipientId");
CREATE INDEX "RecipientVerificationToken_tokenHash_idx" ON "RecipientVerificationToken"("tokenHash");

-- AddForeignKey
ALTER TABLE "RecipientVerificationToken" ADD CONSTRAINT "RecipientVerificationToken_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "Recipient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
