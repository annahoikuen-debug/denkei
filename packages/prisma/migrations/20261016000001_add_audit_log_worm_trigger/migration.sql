-- 中小企業特化・低価格・タイムスタンプなし割り切り型「デンケイ」
-- 電子帳簿保存法(真実性)対応: DocumentAuditLog への UPDATE / DELETE を DB レベルで物理遮断する WORM トリガー

CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'DocumentAuditLog records are append-only (WORM) and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_update ON "DocumentAuditLog";
CREATE TRIGGER trg_prevent_audit_log_update
BEFORE UPDATE ON "DocumentAuditLog"
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS trg_prevent_audit_log_delete ON "DocumentAuditLog";
CREATE TRIGGER trg_prevent_audit_log_delete
BEFORE DELETE ON "DocumentAuditLog"
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_mutation();
