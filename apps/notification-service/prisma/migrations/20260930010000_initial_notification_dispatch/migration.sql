-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "notification_dispatch";

-- CreateEnum
CREATE TYPE "notification_dispatch"."NotificationType" AS ENUM ('EXPENSE_APPROVED', 'EXPENSE_REJECTED', 'APPROVAL_REQUIRED', 'BUDGET_ALERT', 'INVITATION', 'SYSTEM_ALERT');

-- CreateEnum
CREATE TYPE "notification_dispatch"."NotificationChannel" AS ENUM ('EMAIL', 'IN_APP', 'PUSH');

-- CreateEnum
CREATE TYPE "notification_dispatch"."NotificationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "notification_dispatch"."NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "notification_dispatch"."OutboxEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'DEAD_LETTER');

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
    "read_at" TIMESTAMPTZ(6),
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

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
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_dispatch"."outbox_event" (
    "id" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "notification_dispatch"."OutboxEventStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "outbox_event_pkey" PRIMARY KEY ("id")
);

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
CREATE INDEX "outbox_event_status_created_at_idx" ON "notification_dispatch"."outbox_event"("status", "created_at");

-- CreateIndex
CREATE INDEX "outbox_event_aggregate_id_idx" ON "notification_dispatch"."outbox_event"("aggregate_id");
