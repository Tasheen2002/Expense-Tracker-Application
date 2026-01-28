-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "budget_planning";

-- CreateEnum
CREATE TYPE "budget_planning"."ForecastType" AS ENUM ('BASELINE', 'OPTIMISTIC', 'PESSIMISTIC', 'CUSTOM');

-- CreateEnum
CREATE TYPE "budget_planning"."PlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- DropForeignKey
ALTER TABLE "categorization_rules"."rule_executions" DROP CONSTRAINT "rule_executions_rule_id_fkey";

-- DropIndex
DROP INDEX "categorization_rules"."category_rules_is_active_idx";

-- DropIndex
DROP INDEX "categorization_rules"."category_rules_priority_idx";

-- DropIndex
DROP INDEX "categorization_rules"."category_rules_target_category_id_idx";

-- DropIndex
DROP INDEX "categorization_rules"."category_rules_workspace_id_idx";

-- DropIndex
DROP INDEX "categorization_rules"."category_suggestions_expense_id_idx";

-- DropIndex
DROP INDEX "categorization_rules"."category_suggestions_is_accepted_idx";

-- DropIndex
DROP INDEX "categorization_rules"."category_suggestions_suggested_category_id_idx";

-- DropIndex
DROP INDEX "categorization_rules"."category_suggestions_workspace_id_idx";

-- DropIndex
DROP INDEX "categorization_rules"."rule_executions_executed_at_idx";

-- DropIndex
DROP INDEX "categorization_rules"."rule_executions_expense_id_idx";

-- DropIndex
DROP INDEX "categorization_rules"."rule_executions_rule_id_idx";

-- DropIndex
DROP INDEX "categorization_rules"."rule_executions_workspace_id_idx";

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

-- AddForeignKey
ALTER TABLE "budget_planning"."forecasts" ADD CONSTRAINT "forecasts_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "budget_planning"."budget_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_planning"."scenarios" ADD CONSTRAINT "scenarios_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "budget_planning"."budget_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_planning"."forecast_items" ADD CONSTRAINT "forecast_items_forecast_id_fkey" FOREIGN KEY ("forecast_id") REFERENCES "budget_planning"."forecasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
