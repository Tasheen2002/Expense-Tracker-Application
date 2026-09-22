-- AlterTable
ALTER TABLE "approval_workflow"."approval_chains" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
