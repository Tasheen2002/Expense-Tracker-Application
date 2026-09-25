-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "budget_management";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "budget_planning";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "cost_allocation";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "expense_ledger";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "inventory_management";

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
CREATE TYPE "budget_planning"."ForecastType" AS ENUM ('BASELINE', 'OPTIMISTIC', 'PESSIMISTIC', 'CUSTOM');

-- CreateEnum
CREATE TYPE "budget_planning"."PlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "expense_ledger"."SplitType" AS ENUM ('EQUAL', 'EXACT', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "expense_ledger"."SettlementStatus" AS ENUM ('PENDING', 'PARTIAL', 'SETTLED');

-- CreateEnum
CREATE TYPE "inventory_management"."LocationType" AS ENUM ('WAREHOUSE', 'STORE', 'OTHER');

-- CreateEnum
CREATE TYPE "inventory_management"."PurchaseOrderStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "inventory_management"."TransactionType" AS ENUM ('IN', 'OUT', 'TRANSFER', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "expense_ledger"."OutboxEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'DEAD_LETTER');

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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_ledger"."tags" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "color" VARCHAR(7),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_ledger"."expense_tags" (
    "expense_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

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
    "notified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "spending_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_planning"."budget_plans" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "period_type" "budget_management"."BudgetPeriodType" NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "budget_planning"."PlanStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "budget_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_planning"."forecasts" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" "budget_planning"."ForecastType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_planning"."scenarios" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "assumptions" JSONB,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_planning"."forecast_items" (
    "id" UUID NOT NULL,
    "forecast_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "notes" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "forecast_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_ledger"."expense_splits" (
    "id" UUID NOT NULL,
    "expense_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "paid_by" UUID NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "split_type" "expense_ledger"."SplitType" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "expense_splits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_ledger"."split_participants" (
    "id" UUID NOT NULL,
    "split_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "share_amount" DECIMAL(12,2) NOT NULL,
    "share_percentage" DECIMAL(5,2),
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "split_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_ledger"."split_settlements" (
    "id" UUID NOT NULL,
    "split_id" UUID NOT NULL,
    "from_user_id" UUID NOT NULL,
    "to_user_id" UUID NOT NULL,
    "total_owed_amount" DECIMAL(12,2) NOT NULL,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "status" "expense_ledger"."SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "settled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "split_settlements_pkey" PRIMARY KEY ("id")
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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_management"."supplier" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "contact_email" VARCHAR(255),
    "contact_phone" VARCHAR(50),
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_management"."location" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" "inventory_management"."LocationType" NOT NULL DEFAULT 'WAREHOUSE',
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_management"."purchase_order" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "status" "inventory_management"."PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "order_date" DATE NOT NULL,
    "expected_date" DATE,
    "received_date" DATE,
    "notes" TEXT,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "purchase_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_management"."purchase_order_item" (
    "id" UUID NOT NULL,
    "purchase_order_id" UUID NOT NULL,
    "variant_id" VARCHAR(255) NOT NULL,
    "variant_name" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "received_quantity" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "purchase_order_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_management"."stock" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "variant_id" VARCHAR(255) NOT NULL,
    "location_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reserved_quantity" INTEGER NOT NULL DEFAULT 0,
    "reorder_level" INTEGER NOT NULL DEFAULT 0,
    "reorder_quantity" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_management"."inventory_transaction" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "variant_id" VARCHAR(255) NOT NULL,
    "location_id" UUID NOT NULL,
    "type" "inventory_management"."TransactionType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reference_id" UUID,
    "reference_type" VARCHAR(50),
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_ledger"."outbox_event" (
    "id" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "expense_ledger"."OutboxEventStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "outbox_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_ledger"."processed_events" (
    "id" UUID NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "processed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_events_pkey" PRIMARY KEY ("id")
);

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
CREATE INDEX "budget_plans_workspace_id_status_idx" ON "budget_planning"."budget_plans"("workspace_id", "status");

-- CreateIndex
CREATE INDEX "forecasts_plan_id_idx" ON "budget_planning"."forecasts"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "forecasts_plan_id_name_key" ON "budget_planning"."forecasts"("plan_id", "name");

-- CreateIndex
CREATE INDEX "scenarios_plan_id_idx" ON "budget_planning"."scenarios"("plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "scenarios_plan_id_name_key" ON "budget_planning"."scenarios"("plan_id", "name");

-- CreateIndex
CREATE INDEX "forecast_items_forecast_id_idx" ON "budget_planning"."forecast_items"("forecast_id");

-- CreateIndex
CREATE INDEX "forecast_items_category_id_idx" ON "budget_planning"."forecast_items"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "forecast_items_forecast_id_category_id_key" ON "budget_planning"."forecast_items"("forecast_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "expense_splits_expense_id_key" ON "expense_ledger"."expense_splits"("expense_id");

-- CreateIndex
CREATE INDEX "expense_splits_workspace_id_idx" ON "expense_ledger"."expense_splits"("workspace_id");

-- CreateIndex
CREATE INDEX "expense_splits_paid_by_idx" ON "expense_ledger"."expense_splits"("paid_by");

-- CreateIndex
CREATE INDEX "expense_splits_expense_id_idx" ON "expense_ledger"."expense_splits"("expense_id");

-- CreateIndex
CREATE INDEX "split_participants_split_id_idx" ON "expense_ledger"."split_participants"("split_id");

-- CreateIndex
CREATE INDEX "split_participants_user_id_idx" ON "expense_ledger"."split_participants"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "split_participants_split_id_user_id_key" ON "expense_ledger"."split_participants"("split_id", "user_id");

-- CreateIndex
CREATE INDEX "split_settlements_split_id_idx" ON "expense_ledger"."split_settlements"("split_id");

-- CreateIndex
CREATE INDEX "split_settlements_from_user_id_idx" ON "expense_ledger"."split_settlements"("from_user_id");

-- CreateIndex
CREATE INDEX "split_settlements_to_user_id_idx" ON "expense_ledger"."split_settlements"("to_user_id");

-- CreateIndex
CREATE INDEX "split_settlements_status_idx" ON "expense_ledger"."split_settlements"("status");

-- CreateIndex
CREATE UNIQUE INDEX "split_settlements_split_id_from_user_id_to_user_id_key" ON "expense_ledger"."split_settlements"("split_id", "from_user_id", "to_user_id");

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

-- CreateIndex
CREATE INDEX "supplier_workspace_id_idx" ON "inventory_management"."supplier"("workspace_id");

-- CreateIndex
CREATE INDEX "location_workspace_id_idx" ON "inventory_management"."location"("workspace_id");

-- CreateIndex
CREATE INDEX "purchase_order_workspace_id_idx" ON "inventory_management"."purchase_order"("workspace_id");

-- CreateIndex
CREATE INDEX "purchase_order_supplier_id_idx" ON "inventory_management"."purchase_order"("supplier_id");

-- CreateIndex
CREATE INDEX "purchase_order_status_idx" ON "inventory_management"."purchase_order"("status");

-- CreateIndex
CREATE INDEX "purchase_order_item_purchase_order_id_idx" ON "inventory_management"."purchase_order_item"("purchase_order_id");

-- CreateIndex
CREATE INDEX "stock_workspace_id_idx" ON "inventory_management"."stock"("workspace_id");

-- CreateIndex
CREATE INDEX "stock_location_id_idx" ON "inventory_management"."stock"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_variant_id_location_id_key" ON "inventory_management"."stock"("variant_id", "location_id");

-- CreateIndex
CREATE INDEX "inventory_transaction_workspace_id_idx" ON "inventory_management"."inventory_transaction"("workspace_id");

-- CreateIndex
CREATE INDEX "inventory_transaction_variant_id_idx" ON "inventory_management"."inventory_transaction"("variant_id");

-- CreateIndex
CREATE INDEX "inventory_transaction_location_id_idx" ON "inventory_management"."inventory_transaction"("location_id");

-- CreateIndex
CREATE INDEX "outbox_event_status_created_at_idx" ON "expense_ledger"."outbox_event"("status", "created_at");

-- CreateIndex
CREATE INDEX "outbox_event_aggregate_id_idx" ON "expense_ledger"."outbox_event"("aggregate_id");

-- CreateIndex
CREATE UNIQUE INDEX "processed_events_event_id_key" ON "expense_ledger"."processed_events"("event_id");

-- CreateIndex
CREATE INDEX "processed_events_event_id_idx" ON "expense_ledger"."processed_events"("event_id");

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
ALTER TABLE "budget_planning"."forecasts" ADD CONSTRAINT "forecasts_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "budget_planning"."budget_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_planning"."scenarios" ADD CONSTRAINT "scenarios_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "budget_planning"."budget_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_planning"."forecast_items" ADD CONSTRAINT "forecast_items_forecast_id_fkey" FOREIGN KEY ("forecast_id") REFERENCES "budget_planning"."forecasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_ledger"."split_participants" ADD CONSTRAINT "split_participants_split_id_fkey" FOREIGN KEY ("split_id") REFERENCES "expense_ledger"."expense_splits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_ledger"."split_settlements" ADD CONSTRAINT "split_settlements_split_id_fkey" FOREIGN KEY ("split_id") REFERENCES "expense_ledger"."expense_splits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_allocation"."departments" ADD CONSTRAINT "departments_parent_department_id_fkey" FOREIGN KEY ("parent_department_id") REFERENCES "cost_allocation"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_allocation"."expense_allocations" ADD CONSTRAINT "expense_allocations_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_allocation"."cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_allocation"."expense_allocations" ADD CONSTRAINT "expense_allocations_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "cost_allocation"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_allocation"."expense_allocations" ADD CONSTRAINT "expense_allocations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "cost_allocation"."projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_management"."purchase_order" ADD CONSTRAINT "purchase_order_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "inventory_management"."supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_management"."purchase_order_item" ADD CONSTRAINT "purchase_order_item_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "inventory_management"."purchase_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_management"."stock" ADD CONSTRAINT "stock_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "inventory_management"."location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_management"."inventory_transaction" ADD CONSTRAINT "inventory_transaction_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "inventory_management"."location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

