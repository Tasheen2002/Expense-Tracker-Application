-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "event_outbox";

-- CreateEnum
CREATE TYPE "event_outbox"."OutboxEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateTable
CREATE TABLE "event_outbox"."outbox_event" (
    "id" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "event_outbox"."OutboxEventStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "outbox_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outbox_event_status_created_at_idx" ON "event_outbox"."outbox_event"("status", "created_at");

-- CreateIndex
CREATE INDEX "outbox_event_aggregate_id_idx" ON "event_outbox"."outbox_event"("aggregate_id");
