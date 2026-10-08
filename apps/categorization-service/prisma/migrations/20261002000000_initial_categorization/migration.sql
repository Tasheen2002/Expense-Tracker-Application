-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "categorization_rules";

-- CreateEnum
CREATE TYPE "categorization_rules"."OutboxEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'DEAD_LETTER');

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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "category_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorization_rules"."rule_executions" (
    "id" UUID NOT NULL,
    "rule_id" UUID NOT NULL,
    "expense_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "applied_category_id" UUID NOT NULL,
    "executed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMPTZ(6),

    CONSTRAINT "category_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorization_rules"."outbox_event" (
    "id" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "categorization_rules"."OutboxEventStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "outbox_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outbox_event_status_created_at_idx" ON "categorization_rules"."outbox_event"("status", "created_at");

-- CreateIndex
CREATE INDEX "outbox_event_aggregate_id_idx" ON "categorization_rules"."outbox_event"("aggregate_id");
