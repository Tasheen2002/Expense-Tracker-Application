-- AlterTable
ALTER TABLE "expense_ledger"."recurring_expenses" ADD COLUMN IF NOT EXISTS "consecutive_failures" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "expense_ledger"."recurring_expenses" ADD COLUMN IF NOT EXISTS "last_failure_reason" TEXT;

-- AlterTable
ALTER TABLE "expense_ledger"."recurring_expenses" ADD COLUMN IF NOT EXISTS "last_failure_at" TIMESTAMPTZ(6);
