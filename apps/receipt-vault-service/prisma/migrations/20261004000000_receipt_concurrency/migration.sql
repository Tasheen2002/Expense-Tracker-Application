BEGIN;
ALTER TABLE "receipt_vault"."receipts" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "receipt_vault"."receipts" ADD CONSTRAINT "receipts_version_nonnegative" CHECK ("version" >= 0);
COMMIT;
