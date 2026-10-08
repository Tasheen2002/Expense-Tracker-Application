BEGIN;
-- Fail on legacy cross-workspace assignments rather than inventing ownership.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM receipt_vault.receipt_tags rt
    JOIN receipt_vault.receipts r ON r.id = rt.receipt_id
    JOIN receipt_vault.receipt_tag_definitions t ON t.id = rt.tag_id
    WHERE r.workspace_id <> t.workspace_id) THEN
    RAISE EXCEPTION 'Resolve cross-workspace receipt tags before migrating';
  END IF;
END $$;

ALTER TABLE receipt_vault.receipt_tags ADD COLUMN workspace_id UUID;
UPDATE receipt_vault.receipt_tags rt SET workspace_id = r.workspace_id
FROM receipt_vault.receipts r WHERE r.id = rt.receipt_id;
ALTER TABLE receipt_vault.receipt_tags ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE receipt_vault.receipt_tags DROP CONSTRAINT receipt_tags_receipt_id_fkey;
ALTER TABLE receipt_vault.receipt_tags DROP CONSTRAINT receipt_tags_tag_id_fkey;
CREATE UNIQUE INDEX receipts_id_workspace_id_key ON receipt_vault.receipts(id, workspace_id);
CREATE UNIQUE INDEX receipt_tag_definitions_id_workspace_id_key ON receipt_vault.receipt_tag_definitions(id, workspace_id);
ALTER TABLE receipt_vault.receipt_tags ADD CONSTRAINT receipt_tags_receipt_id_workspace_id_fkey
  FOREIGN KEY (receipt_id, workspace_id) REFERENCES receipt_vault.receipts(id, workspace_id) ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE receipt_vault.receipt_tags ADD CONSTRAINT receipt_tags_tag_id_workspace_id_fkey
  FOREIGN KEY (tag_id, workspace_id) REFERENCES receipt_vault.receipt_tag_definitions(id, workspace_id) ON DELETE CASCADE ON UPDATE RESTRICT;
CREATE INDEX receipt_tags_workspace_id_idx ON receipt_vault.receipt_tags(workspace_id);

-- Soft-deleted receipts do not reserve a hash; restoring may conflict.
CREATE UNIQUE INDEX receipt_active_workspace_hash ON receipt_vault.receipts(workspace_id, file_hash)
  WHERE deleted_at IS NULL AND file_hash IS NOT NULL;
ALTER TABLE receipt_vault.receipts ADD CONSTRAINT receipt_file_size_check CHECK (file_size BETWEEN 1 AND 52428800);
ALTER TABLE receipt_vault.receipts ADD CONSTRAINT receipt_ocr_confidence_check CHECK (ocr_confidence BETWEEN 0 AND 100);
ALTER TABLE receipt_vault.receipts ADD CONSTRAINT receipt_hash_check CHECK (file_hash IS NULL OR file_hash ~ '^[a-f0-9]{64}$');

ALTER TABLE receipt_vault.outbox_event
  ADD COLUMN delivered_to TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN lease_token TEXT,
  ADD COLUMN lease_expires_at TIMESTAMPTZ(6),
  ADD COLUMN next_attempt_at TIMESTAMPTZ(6);
UPDATE receipt_vault.outbox_event SET status = 'PENDING' WHERE status = 'PROCESSING';
UPDATE receipt_vault.outbox_event SET next_attempt_at = now() WHERE status = 'FAILED';
COMMIT;
