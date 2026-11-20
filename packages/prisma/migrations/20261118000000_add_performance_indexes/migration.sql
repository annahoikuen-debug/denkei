-- Phase 2 TASK-05: DB インデックス最適化
-- 頻繁クエリ対象カラムに複合インデックスを追加

-- 文書(Envelope)一覧クエリの最適化: envelopeId + createdAt で直列化
CREATE INDEX IF NOT EXISTS "Envelope_envelopeId_createdAt_idx"
  ON "Envelope"("id", "createdAt" DESC);

-- 受取人クエリの最適化: envelopeId + signingStatus でフィルタ
CREATE INDEX IF NOT EXISTS "Recipient_envelopeId_signingStatus_idx"
  ON "Recipient"("envelopeId", "signingStatus");

-- 監査ログクエリの最適化: envelopeId + createdAt でハッシュチェーン取得
CREATE INDEX IF NOT EXISTS "DocumentAuditLog_envelopeId_createdAt_idx"
  ON "DocumentAuditLog"("envelopeId", "createdAt" DESC);

-- セッションクエリの最適化: userId + expiresAt で有効セッション検索
CREATE INDEX IF NOT EXISTS "Session_userId_expiresAt_idx"
  ON "Session"("userId", "expiresAt");
