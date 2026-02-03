-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "policy_controls";

-- CreateEnum
CREATE TYPE "policy_controls"."PolicyType" AS ENUM ('SPENDING_LIMIT', 'DAILY_LIMIT', 'WEEKLY_LIMIT', 'MONTHLY_LIMIT', 'CATEGORY_RESTRICTION', 'MERCHANT_BLACKLIST', 'TIME_RESTRICTION', 'RECEIPT_REQUIRED', 'DESCRIPTION_REQUIRED', 'APPROVAL_REQUIRED');

-- CreateEnum
CREATE TYPE "policy_controls"."ViolationSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "policy_controls"."ViolationStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'RESOLVED', 'EXEMPTED', 'OVERRIDDEN');

-- CreateEnum
CREATE TYPE "policy_controls"."ExemptionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "policy_controls"."expense_policies" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "policy_type" "policy_controls"."PolicyType" NOT NULL,
    "severity" "policy_controls"."ViolationSeverity" NOT NULL,
    "configuration" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "expense_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_controls"."policy_violations" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "policy_id" UUID NOT NULL,
    "expense_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "policy_controls"."ViolationStatus" NOT NULL DEFAULT 'PENDING',
    "severity" "policy_controls"."ViolationSeverity" NOT NULL,
    "violation_details" TEXT NOT NULL,
    "expense_amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "detected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_at" TIMESTAMPTZ(6),
    "acknowledged_by" UUID,
    "resolved_at" TIMESTAMPTZ(6),
    "resolved_by" UUID,
    "resolution_note" TEXT,
    "exemption_id" UUID,
    "overridden_by" UUID,
    "override_reason" TEXT,

    CONSTRAINT "policy_violations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_controls"."policy_exemptions" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "policy_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "policy_controls"."ExemptionStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "requested_by" UUID NOT NULL,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "approval_note" TEXT,
    "rejected_by" UUID,
    "rejected_at" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,
    "valid_from" TIMESTAMPTZ(6) NOT NULL,
    "valid_until" TIMESTAMPTZ(6) NOT NULL,
    "scope" JSONB,

    CONSTRAINT "policy_exemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expense_policies_workspace_id_idx" ON "policy_controls"."expense_policies"("workspace_id");

-- CreateIndex
CREATE INDEX "expense_policies_is_active_idx" ON "policy_controls"."expense_policies"("is_active");

-- CreateIndex
CREATE INDEX "expense_policies_policy_type_idx" ON "policy_controls"."expense_policies"("policy_type");

-- CreateIndex
CREATE INDEX "policy_violations_workspace_id_idx" ON "policy_controls"."policy_violations"("workspace_id");

-- CreateIndex
CREATE INDEX "policy_violations_policy_id_idx" ON "policy_controls"."policy_violations"("policy_id");

-- CreateIndex
CREATE INDEX "policy_violations_expense_id_idx" ON "policy_controls"."policy_violations"("expense_id");

-- CreateIndex
CREATE INDEX "policy_violations_user_id_idx" ON "policy_controls"."policy_violations"("user_id");

-- CreateIndex
CREATE INDEX "policy_violations_status_idx" ON "policy_controls"."policy_violations"("status");

-- CreateIndex
CREATE INDEX "policy_violations_detected_at_idx" ON "policy_controls"."policy_violations"("detected_at");

-- CreateIndex
CREATE INDEX "policy_exemptions_workspace_id_idx" ON "policy_controls"."policy_exemptions"("workspace_id");

-- CreateIndex
CREATE INDEX "policy_exemptions_policy_id_idx" ON "policy_controls"."policy_exemptions"("policy_id");

-- CreateIndex
CREATE INDEX "policy_exemptions_user_id_idx" ON "policy_controls"."policy_exemptions"("user_id");

-- CreateIndex
CREATE INDEX "policy_exemptions_status_idx" ON "policy_controls"."policy_exemptions"("status");

-- CreateIndex
CREATE INDEX "policy_exemptions_valid_from_valid_until_idx" ON "policy_controls"."policy_exemptions"("valid_from", "valid_until");

-- AddForeignKey
ALTER TABLE "policy_controls"."policy_violations" ADD CONSTRAINT "policy_violations_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policy_controls"."expense_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_controls"."policy_exemptions" ADD CONSTRAINT "policy_exemptions_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policy_controls"."expense_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
