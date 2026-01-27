-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "approval_workflow";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "budget_management";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "cost_allocation";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "expense_ledger";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "identity_workspace";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "notification_dispatch";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "receipt_vault";

-- CreateEnum
CREATE TYPE "expense_ledger"."PaymentMethod" AS ENUM ('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'CHECK', 'DIGITAL_WALLET', 'OTHER');

-- CreateEnum
CREATE TYPE "expense_ledger"."ExpenseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'REIMBURSED');

-- CreateEnum
CREATE TYPE "expense_ledger"."RecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "expense_ledger"."RecurrenceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "budget_management"."BudgetPeriodType" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "budget_management"."BudgetStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED', 'EXCEEDED');

-- CreateEnum
CREATE TYPE "budget_management"."AlertLevel" AS ENUM ('INFO', 'WARNING', 'CRITICAL', 'EXCEEDED');

-- CreateEnum
CREATE TYPE "receipt_vault"."ReceiptStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "receipt_vault"."ReceiptType" AS ENUM ('EXPENSE', 'INVOICE', 'BILL', 'TICKET', 'OTHER');

-- CreateEnum
CREATE TYPE "receipt_vault"."StorageProvider" AS ENUM ('LOCAL', 'S3', 'AZURE_BLOB', 'GCS');

-- CreateEnum
CREATE TYPE "approval_workflow"."ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected', 'delegated', 'auto_approved');

-- CreateEnum
CREATE TYPE "approval_workflow"."WorkflowStatus" AS ENUM ('pending', 'in_progress', 'approved', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "notification_dispatch"."NotificationType" AS ENUM ('EXPENSE_APPROVED', 'EXPENSE_REJECTED', 'APPROVAL_REQUIRED', 'BUDGET_ALERT', 'INVITATION', 'SYSTEM_ALERT');

-- CreateEnum
CREATE TYPE "notification_dispatch"."NotificationChannel" AS ENUM ('EMAIL', 'IN_APP', 'PUSH');

-- CreateEnum
CREATE TYPE "notification_dispatch"."NotificationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "notification_dispatch"."NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');

-- CreateTable
CREATE TABLE "identity_workspace"."user_account" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_workspace"."workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_workspace"."workspace_membership" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_workspace"."workspace_invitation" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_workspace"."auth_session" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_ledger"."expenses" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "expense_date" DATE NOT NULL,
    "category_id" UUID,
    "merchant" VARCHAR(255),
    "payment_method" "expense_ledger"."PaymentMethod" NOT NULL DEFAULT 'CASH',
    "is_reimbursable" BOOLEAN NOT NULL DEFAULT false,
    "status" "expense_ledger"."ExpenseStatus" NOT NULL DEFAULT 'SUBMITTED',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_ledger"."categories" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "color" VARCHAR(7),
    "icon" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_ledger"."tags" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "color" VARCHAR(7),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_ledger"."expense_tags" (
    "expense_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_tags_pkey" PRIMARY KEY ("expense_id","tag_id")
);

-- CreateTable
CREATE TABLE "expense_ledger"."attachments" (
    "id" UUID NOT NULL,
    "expense_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_ledger"."recurring_expenses" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "frequency" "expense_ledger"."RecurrenceFrequency" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "next_run_date" DATE NOT NULL,
    "status" "expense_ledger"."RecurrenceStatus" NOT NULL DEFAULT 'ACTIVE',
    "template" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "recurring_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_management"."budgets" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "period_type" "budget_management"."BudgetPeriodType" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "budget_management"."BudgetStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by" UUID NOT NULL,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "rollover_unused" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_management"."budget_allocations" (
    "id" UUID NOT NULL,
    "budget_id" UUID NOT NULL,
    "category_id" UUID,
    "allocated_amount" DECIMAL(12,2) NOT NULL,
    "spent_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "description" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "budget_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_management"."budget_alerts" (
    "id" UUID NOT NULL,
    "budget_id" UUID NOT NULL,
    "allocation_id" UUID,
    "level" "budget_management"."AlertLevel" NOT NULL,
    "threshold" DECIMAL(5,2) NOT NULL,
    "current_spent" DECIMAL(12,2) NOT NULL,
    "allocated_amount" DECIMAL(12,2) NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "notified_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_management"."spending_limits" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID,
    "category_id" UUID,
    "limit_amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "period_type" "budget_management"."BudgetPeriodType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "spending_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_vault"."receipts" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "expense_id" UUID,
    "user_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(1000) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_hash" VARCHAR(64),
    "receipt_type" "receipt_vault"."ReceiptType" NOT NULL DEFAULT 'EXPENSE',
    "status" "receipt_vault"."ReceiptStatus" NOT NULL DEFAULT 'PENDING',
    "storage_provider" "receipt_vault"."StorageProvider" NOT NULL DEFAULT 'LOCAL',
    "storage_bucket" VARCHAR(255),
    "storage_key" VARCHAR(500),
    "thumbnail_path" VARCHAR(1000),
    "ocr_text" TEXT,
    "ocr_confidence" DECIMAL(5,2),
    "processed_at" TIMESTAMPTZ,
    "failure_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_vault"."receipt_metadata" (
    "id" UUID NOT NULL,
    "receipt_id" UUID NOT NULL,
    "merchant_name" VARCHAR(255),
    "merchant_address" TEXT,
    "merchant_phone" VARCHAR(50),
    "merchant_tax_id" VARCHAR(50),
    "transaction_date" DATE,
    "transaction_time" VARCHAR(20),
    "subtotal" DECIMAL(12,2),
    "tax_amount" DECIMAL(12,2),
    "tip_amount" DECIMAL(12,2),
    "total_amount" DECIMAL(12,2),
    "currency" VARCHAR(3),
    "payment_method" VARCHAR(50),
    "last_four_digits" VARCHAR(4),
    "invoice_number" VARCHAR(100),
    "po_number" VARCHAR(100),
    "line_items" JSONB,
    "notes" TEXT,
    "custom_fields" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "receipt_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_vault"."receipt_tag_definitions" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "color" VARCHAR(7),
    "description" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipt_tag_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_vault"."receipt_tags" (
    "receipt_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipt_tags_pkey" PRIMARY KEY ("receipt_id","tag_id")
);

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
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

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
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "completed_at" TIMESTAMPTZ,

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
    "processed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "approval_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_dispatch"."notifications" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "type" "notification_dispatch"."NotificationType" NOT NULL,
    "channel" "notification_dispatch"."NotificationChannel" NOT NULL,
    "priority" "notification_dispatch"."NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "data" JSONB,
    "status" "notification_dispatch"."NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "read_at" TIMESTAMPTZ,
    "sent_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_dispatch"."notification_templates" (
    "id" UUID NOT NULL,
    "workspace_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "type" "notification_dispatch"."NotificationType" NOT NULL,
    "channel" "notification_dispatch"."NotificationChannel" NOT NULL,
    "subject_template" VARCHAR(255) NOT NULL,
    "body_template" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_dispatch"."notification_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
    "push_enabled" BOOLEAN NOT NULL DEFAULT false,
    "type_settings" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_allocation"."departments" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "manager_id" UUID,
    "parent_department_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_allocation"."cost_centers" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_allocation"."projects" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "manager_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "budget" DECIMAL(12,2),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_allocation"."expense_allocations" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "expense_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "percentage" DECIMAL(5,2),
    "department_id" UUID,
    "cost_center_id" UUID,
    "project_id" UUID,
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_account_email_key" ON "identity_workspace"."user_account"("email");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_slug_key" ON "identity_workspace"."workspace"("slug");

-- CreateIndex
CREATE INDEX "workspace_membership_workspace_id_idx" ON "identity_workspace"."workspace_membership"("workspace_id");

-- CreateIndex
CREATE INDEX "workspace_membership_user_id_idx" ON "identity_workspace"."workspace_membership"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_membership_user_id_workspace_id_key" ON "identity_workspace"."workspace_membership"("user_id", "workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_invitation_token_key" ON "identity_workspace"."workspace_invitation"("token");

-- CreateIndex
CREATE INDEX "workspace_invitation_workspace_id_idx" ON "identity_workspace"."workspace_invitation"("workspace_id");

-- CreateIndex
CREATE INDEX "workspace_invitation_email_idx" ON "identity_workspace"."workspace_invitation"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_session_token_key" ON "identity_workspace"."auth_session"("token");

-- CreateIndex
CREATE INDEX "auth_session_user_id_idx" ON "identity_workspace"."auth_session"("user_id");

-- CreateIndex
CREATE INDEX "expenses_workspace_id_idx" ON "expense_ledger"."expenses"("workspace_id");

-- CreateIndex
CREATE INDEX "expenses_user_id_idx" ON "expense_ledger"."expenses"("user_id");

-- CreateIndex
CREATE INDEX "expenses_category_id_idx" ON "expense_ledger"."expenses"("category_id");

-- CreateIndex
CREATE INDEX "expenses_expense_date_idx" ON "expense_ledger"."expenses"("expense_date");

-- CreateIndex
CREATE INDEX "expenses_status_idx" ON "expense_ledger"."expenses"("status");

-- CreateIndex
CREATE INDEX "expenses_created_at_idx" ON "expense_ledger"."expenses"("created_at");

-- CreateIndex
CREATE INDEX "categories_workspace_id_idx" ON "expense_ledger"."categories"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "category_workspace_name" ON "expense_ledger"."categories"("workspace_id", "name");

-- CreateIndex
CREATE INDEX "tags_workspace_id_idx" ON "expense_ledger"."tags"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "tag_workspace_name" ON "expense_ledger"."tags"("workspace_id", "name");

-- CreateIndex
CREATE INDEX "expense_tags_expense_id_idx" ON "expense_ledger"."expense_tags"("expense_id");

-- CreateIndex
CREATE INDEX "expense_tags_tag_id_idx" ON "expense_ledger"."expense_tags"("tag_id");

-- CreateIndex
CREATE INDEX "attachments_expense_id_idx" ON "expense_ledger"."attachments"("expense_id");

-- CreateIndex
CREATE INDEX "recurring_expenses_workspace_id_idx" ON "expense_ledger"."recurring_expenses"("workspace_id");

-- CreateIndex
CREATE INDEX "recurring_expenses_user_id_idx" ON "expense_ledger"."recurring_expenses"("user_id");

-- CreateIndex
CREATE INDEX "recurring_expenses_next_run_date_idx" ON "expense_ledger"."recurring_expenses"("next_run_date");

-- CreateIndex
CREATE INDEX "recurring_expenses_status_idx" ON "expense_ledger"."recurring_expenses"("status");

-- CreateIndex
CREATE INDEX "budgets_workspace_id_idx" ON "budget_management"."budgets"("workspace_id");

-- CreateIndex
CREATE INDEX "budgets_status_idx" ON "budget_management"."budgets"("status");

-- CreateIndex
CREATE INDEX "budgets_start_date_end_date_idx" ON "budget_management"."budgets"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "budgets_created_by_idx" ON "budget_management"."budgets"("created_by");

-- CreateIndex
CREATE INDEX "budget_allocations_budget_id_idx" ON "budget_management"."budget_allocations"("budget_id");

-- CreateIndex
CREATE INDEX "budget_allocations_category_id_idx" ON "budget_management"."budget_allocations"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "budget_category_allocation" ON "budget_management"."budget_allocations"("budget_id", "category_id");

-- CreateIndex
CREATE INDEX "budget_alerts_budget_id_idx" ON "budget_management"."budget_alerts"("budget_id");

-- CreateIndex
CREATE INDEX "budget_alerts_allocation_id_idx" ON "budget_management"."budget_alerts"("allocation_id");

-- CreateIndex
CREATE INDEX "budget_alerts_level_idx" ON "budget_management"."budget_alerts"("level");

-- CreateIndex
CREATE INDEX "budget_alerts_is_read_idx" ON "budget_management"."budget_alerts"("is_read");

-- CreateIndex
CREATE INDEX "budget_alerts_created_at_idx" ON "budget_management"."budget_alerts"("created_at");

-- CreateIndex
CREATE INDEX "spending_limits_workspace_id_idx" ON "budget_management"."spending_limits"("workspace_id");

-- CreateIndex
CREATE INDEX "spending_limits_user_id_idx" ON "budget_management"."spending_limits"("user_id");

-- CreateIndex
CREATE INDEX "spending_limits_category_id_idx" ON "budget_management"."spending_limits"("category_id");

-- CreateIndex
CREATE INDEX "spending_limits_is_active_idx" ON "budget_management"."spending_limits"("is_active");

-- CreateIndex
CREATE INDEX "receipts_workspace_id_idx" ON "receipt_vault"."receipts"("workspace_id");

-- CreateIndex
CREATE INDEX "receipts_expense_id_idx" ON "receipt_vault"."receipts"("expense_id");

-- CreateIndex
CREATE INDEX "receipts_user_id_idx" ON "receipt_vault"."receipts"("user_id");

-- CreateIndex
CREATE INDEX "receipts_status_idx" ON "receipt_vault"."receipts"("status");

-- CreateIndex
CREATE INDEX "receipts_receipt_type_idx" ON "receipt_vault"."receipts"("receipt_type");

-- CreateIndex
CREATE INDEX "receipts_created_at_idx" ON "receipt_vault"."receipts"("created_at");

-- CreateIndex
CREATE INDEX "receipts_file_hash_idx" ON "receipt_vault"."receipts"("file_hash");

-- CreateIndex
CREATE UNIQUE INDEX "receipt_metadata_receipt_id_key" ON "receipt_vault"."receipt_metadata"("receipt_id");

-- CreateIndex
CREATE INDEX "receipt_metadata_merchant_name_idx" ON "receipt_vault"."receipt_metadata"("merchant_name");

-- CreateIndex
CREATE INDEX "receipt_metadata_transaction_date_idx" ON "receipt_vault"."receipt_metadata"("transaction_date");

-- CreateIndex
CREATE INDEX "receipt_metadata_invoice_number_idx" ON "receipt_vault"."receipt_metadata"("invoice_number");

-- CreateIndex
CREATE INDEX "receipt_tag_definitions_workspace_id_idx" ON "receipt_vault"."receipt_tag_definitions"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "receipt_tag_workspace_name" ON "receipt_vault"."receipt_tag_definitions"("workspace_id", "name");

-- CreateIndex
CREATE INDEX "receipt_tags_receipt_id_idx" ON "receipt_vault"."receipt_tags"("receipt_id");

-- CreateIndex
CREATE INDEX "receipt_tags_tag_id_idx" ON "receipt_vault"."receipt_tags"("tag_id");

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
CREATE INDEX "notifications_recipient_id_workspace_id_idx" ON "notification_dispatch"."notifications"("recipient_id", "workspace_id");

-- CreateIndex
CREATE INDEX "notifications_recipient_id_read_at_idx" ON "notification_dispatch"."notifications"("recipient_id", "read_at");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notification_dispatch"."notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notification_dispatch"."notifications"("type");

-- CreateIndex
CREATE INDEX "notification_templates_type_channel_is_active_idx" ON "notification_dispatch"."notification_templates"("type", "channel", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_workspace_id_type_channel_key" ON "notification_dispatch"."notification_templates"("workspace_id", "type", "channel");

-- CreateIndex
CREATE INDEX "notification_preferences_user_id_idx" ON "notification_dispatch"."notification_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_workspace_id_key" ON "notification_dispatch"."notification_preferences"("user_id", "workspace_id");

-- CreateIndex
CREATE INDEX "departments_workspace_id_idx" ON "cost_allocation"."departments"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_workspace_id_code_key" ON "cost_allocation"."departments"("workspace_id", "code");

-- CreateIndex
CREATE INDEX "cost_centers_workspace_id_idx" ON "cost_allocation"."cost_centers"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "cost_centers_workspace_id_code_key" ON "cost_allocation"."cost_centers"("workspace_id", "code");

-- CreateIndex
CREATE INDEX "projects_workspace_id_idx" ON "cost_allocation"."projects"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_workspace_id_code_key" ON "cost_allocation"."projects"("workspace_id", "code");

-- CreateIndex
CREATE INDEX "expense_allocations_expense_id_idx" ON "cost_allocation"."expense_allocations"("expense_id");

-- CreateIndex
CREATE INDEX "expense_allocations_workspace_id_idx" ON "cost_allocation"."expense_allocations"("workspace_id");

-- CreateIndex
CREATE INDEX "expense_allocations_department_id_idx" ON "cost_allocation"."expense_allocations"("department_id");

-- CreateIndex
CREATE INDEX "expense_allocations_cost_center_id_idx" ON "cost_allocation"."expense_allocations"("cost_center_id");

-- CreateIndex
CREATE INDEX "expense_allocations_project_id_idx" ON "cost_allocation"."expense_allocations"("project_id");

-- CreateIndex
CREATE INDEX "expense_allocations_created_by_idx" ON "cost_allocation"."expense_allocations"("created_by");

-- AddForeignKey
ALTER TABLE "identity_workspace"."workspace_membership" ADD CONSTRAINT "workspace_membership_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity_workspace"."user_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_workspace"."workspace_membership" ADD CONSTRAINT "workspace_membership_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "identity_workspace"."workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_ledger"."expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_ledger"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_ledger"."expense_tags" ADD CONSTRAINT "expense_tags_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expense_ledger"."expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_ledger"."expense_tags" ADD CONSTRAINT "expense_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "expense_ledger"."tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_ledger"."attachments" ADD CONSTRAINT "attachments_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expense_ledger"."expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_management"."budget_allocations" ADD CONSTRAINT "budget_allocations_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budget_management"."budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_management"."budget_alerts" ADD CONSTRAINT "budget_alerts_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budget_management"."budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_vault"."receipt_metadata" ADD CONSTRAINT "receipt_metadata_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "receipt_vault"."receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_vault"."receipt_tags" ADD CONSTRAINT "receipt_tags_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "receipt_vault"."receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_vault"."receipt_tags" ADD CONSTRAINT "receipt_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "receipt_vault"."receipt_tag_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_workflow"."expense_workflows" ADD CONSTRAINT "expense_workflows_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "approval_workflow"."approval_chains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_workflow"."approval_steps" ADD CONSTRAINT "approval_steps_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "approval_workflow"."expense_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_allocation"."departments" ADD CONSTRAINT "departments_parent_department_id_fkey" FOREIGN KEY ("parent_department_id") REFERENCES "cost_allocation"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_allocation"."expense_allocations" ADD CONSTRAINT "expense_allocations_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "cost_allocation"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_allocation"."expense_allocations" ADD CONSTRAINT "expense_allocations_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_allocation"."cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_allocation"."expense_allocations" ADD CONSTRAINT "expense_allocations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "cost_allocation"."projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

