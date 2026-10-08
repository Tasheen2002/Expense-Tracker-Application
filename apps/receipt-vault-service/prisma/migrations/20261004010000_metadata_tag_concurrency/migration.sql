BEGIN;
ALTER TABLE receipt_vault.receipt_metadata ADD COLUMN version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE receipt_vault.receipt_metadata ADD CONSTRAINT receipt_metadata_version_nonnegative CHECK (version >= 0);
ALTER TABLE receipt_vault.receipt_tag_definitions ADD COLUMN version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE receipt_vault.receipt_tag_definitions ADD CONSTRAINT receipt_tag_version_nonnegative CHECK (version >= 0);
COMMIT;
