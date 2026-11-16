-- 電子帳簿保存法(真実性・追跡可能性)対応:
-- DocumentAuditLog への不正な改ざん・削除は引き続き物理遮断しつつ、
-- 外部キー制約 (onDelete: SetNull) による envelopeId の NULL 化操作が発生した場合の例外耐性を付与する。
-- （監査ログ本文 data, hash, type, createdAt の UPDATE や DELETE は引き続き全面禁止）

CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    -- 外部キー制約に伴う envelopeId の NULL 化のみ許可 (他の全フィールドが不変であること)
    IF (TG_OP = 'UPDATE'
        AND OLD.envelopeId IS NOT NULL
        AND NEW.envelopeId IS NULL
        AND OLD.id = NEW.id
        AND OLD.createdAt = NEW.createdAt
        AND OLD.type = NEW.type
        AND OLD.data = NEW.data
        AND COALESCE(OLD.prevHash, '') = COALESCE(NEW.prevHash, '')
        AND COALESCE(OLD.hash, '') = COALESCE(NEW.hash, '')) THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'DocumentAuditLog records are append-only (WORM) and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;
