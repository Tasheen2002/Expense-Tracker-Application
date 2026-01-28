-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "categorization_rules";

-- CreateEnum
CREATE TYPE "categorization_rules"."RuleConditionType" AS ENUM ('MERCHANT_CONTAINS', 'MERCHANT_EQUALS', 'AMOUNT_GREATER_THAN', 'AMOUNT_LESS_THAN', 'AMOUNT_EQUALS', 'DESCRIPTION_CONTAINS', 'PAYMENT_METHOD_EQUALS');

-- CreateTable
CREATE TABLE "categorization_rules"."category_rules" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "condition_type" "categorization_rules"."RuleConditionType" NOT NULL,
    "condition_value" VARCHAR(255) NOT NULL,
    "target_category_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "category_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorization_rules"."rule_executions" (
    "id" UUID NOT NULL,
    "rule_id" UUID NOT NULL,
    "expense_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "applied_category_id" UUID NOT NULL,
    "executed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rule_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorization_rules"."category_suggestions" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "expense_id" UUID NOT NULL,
    "suggested_category_id" UUID NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reason" VARCHAR(500),
    "is_accepted" BOOLEAN,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMPTZ,

    CONSTRAINT "category_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "category_rules_workspace_id_idx" ON "categorization_rules"."category_rules"("workspace_id");

-- CreateIndex
CREATE INDEX "category_rules_target_category_id_idx" ON "categorization_rules"."category_rules"("target_category_id");

-- CreateIndex
CREATE INDEX "category_rules_is_active_idx" ON "categorization_rules"."category_rules"("is_active");

-- CreateIndex
CREATE INDEX "category_rules_priority_idx" ON "categorization_rules"."category_rules"("priority");

-- CreateIndex
CREATE INDEX "rule_executions_rule_id_idx" ON "categorization_rules"."rule_executions"("rule_id");

-- CreateIndex
CREATE INDEX "rule_executions_expense_id_idx" ON "categorization_rules"."rule_executions"("expense_id");

-- CreateIndex
CREATE INDEX "rule_executions_workspace_id_idx" ON "categorization_rules"."rule_executions"("workspace_id");

-- CreateIndex
CREATE INDEX "rule_executions_executed_at_idx" ON "categorization_rules"."rule_executions"("executed_at");

-- CreateIndex
CREATE INDEX "category_suggestions_workspace_id_idx" ON "categorization_rules"."category_suggestions"("workspace_id");

-- CreateIndex
CREATE INDEX "category_suggestions_expense_id_idx" ON "categorization_rules"."category_suggestions"("expense_id");

-- CreateIndex
CREATE INDEX "category_suggestions_suggested_category_id_idx" ON "categorization_rules"."category_suggestions"("suggested_category_id");

-- CreateIndex
CREATE INDEX "category_suggestions_is_accepted_idx" ON "categorization_rules"."category_suggestions"("is_accepted");

-- AddForeignKey
ALTER TABLE "categorization_rules"."rule_executions" ADD CONSTRAINT "rule_executions_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "categorization_rules"."category_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
