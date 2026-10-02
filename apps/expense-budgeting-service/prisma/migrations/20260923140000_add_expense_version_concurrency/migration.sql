-- AlterTable
ALTER TABLE "expense_ledger"."expenses" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
