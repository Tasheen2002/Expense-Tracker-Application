-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "approval_workflow";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "policy_controls";

-- CreateEnum
CREATE TYPE "approval_workflow"."ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected', 'delegated', 'auto_approved');

-- CreateEnum
CREATE TYPE "approval_workflow"."WorkflowStatus" AS ENUM ('pending', 'in_progress', 'approved', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "policy_controls"."PolicyType" AS ENUM ('SPENDING_LIMIT', 'DAILY_LIMIT', 'WEEKLY_LIMIT', 'MONTHLY_LIMIT', 'CATEGORY_RESTRICTION', 'MERCHANT_BLACKLIST', 'TIME_RESTRICTION', 'RECEIPT_REQUIRED', 'DESCRIPTION_REQUIRED', 'APPROVAL_REQUIRED');

-- CreateEnum
CREATE TYPE "policy_controls"."ViolationSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "policy_controls"."ViolationStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'RESOLVED', 'EXEMPTED', 'OVERRIDDEN');

-- CreateEnum
CREATE TYPE "policy_controls"."ExemptionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "approval_workflow"."OutboxEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'DEAD_LETTER');

-- CreateTable
CREATE TABLE "approval_workflow"."approval_chains" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "min_amount" DECIMAL(12,2),
    "max_amount" DECIMAL(12,2),
    "category_ids" UUID[],
    "requires_receipt" BOOLEAN NOT NULL DEFAULT false,
    "approver_sequence" UUID[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "approval_chains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_workflow"."expense_workflows" (
    "id" UUID NOT NULL,
    "expense_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "chain_id" UUID NOT NULL,
    "status" "approval_workflow"."WorkflowStatus" NOT NULL DEFAULT 'pending',
    "current_step_number" INTEGER NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "expense_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_workflow"."approval_steps" (
    "id" UUID NOT NULL,
    "workflow_id" UUID NOT NULL,
    "step_number" INTEGER NOT NULL,
    "approver_id" UUID NOT NULL,
    "delegated_to" UUID,
    "status" "approval_workflow"."ApprovalStatus" NOT NULL DEFAULT 'pending',
    "comments" TEXT,
    "processed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "approval_steps_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "approval_workflow"."outbox_event" (
    "id" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "approval_workflow"."OutboxEventStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "delivered_to" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lease_token" TEXT,
    "lease_expires_at" TIMESTAMP(3),
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "approval_chains_workspace_id_idx" ON "approval_workflow"."approval_chains"("workspace_id");

-- CreateIndex
CREATE INDEX "approval_chains_is_active_idx" ON "approval_workflow"."approval_chains"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "expense_workflows_expense_id_key" ON "approval_workflow"."expense_workflows"("expense_id");

-- CreateIndex
CREATE INDEX "expense_workflows_expense_id_idx" ON "approval_workflow"."expense_workflows"("expense_id");

-- CreateIndex
CREATE INDEX "expense_workflows_workspace_id_idx" ON "approval_workflow"."expense_workflows"("workspace_id");

-- CreateIndex
CREATE INDEX "expense_workflows_user_id_idx" ON "approval_workflow"."expense_workflows"("user_id");

-- CreateIndex
CREATE INDEX "expense_workflows_chain_id_idx" ON "approval_workflow"."expense_workflows"("chain_id");

-- CreateIndex
CREATE INDEX "expense_workflows_status_idx" ON "approval_workflow"."expense_workflows"("status");

-- CreateIndex
CREATE INDEX "approval_steps_workflow_id_idx" ON "approval_workflow"."approval_steps"("workflow_id");

-- CreateIndex
CREATE INDEX "approval_steps_approver_id_idx" ON "approval_workflow"."approval_steps"("approver_id");

-- CreateIndex
CREATE INDEX "approval_steps_delegated_to_idx" ON "approval_workflow"."approval_steps"("delegated_to");

-- CreateIndex
CREATE INDEX "approval_steps_status_idx" ON "approval_workflow"."approval_steps"("status");

-- CreateIndex
CREATE UNIQUE INDEX "approval_steps_workflow_id_step_number_key" ON "approval_workflow"."approval_steps"("workflow_id", "step_number");

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

-- CreateIndex
CREATE INDEX "outbox_event_status_created_at_idx" ON "approval_workflow"."outbox_event"("status", "created_at");

-- CreateIndex
CREATE INDEX "outbox_event_aggregate_id_idx" ON "approval_workflow"."outbox_event"("aggregate_id");

-- AddForeignKey
ALTER TABLE "approval_workflow"."expense_workflows" ADD CONSTRAINT "expense_workflows_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "approval_workflow"."approval_chains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_workflow"."approval_steps" ADD CONSTRAINT "approval_steps_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "approval_workflow"."expense_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_controls"."policy_violations" ADD CONSTRAINT "policy_violations_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policy_controls"."expense_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_controls"."policy_exemptions" ADD CONSTRAINT "policy_exemptions_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policy_controls"."expense_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

