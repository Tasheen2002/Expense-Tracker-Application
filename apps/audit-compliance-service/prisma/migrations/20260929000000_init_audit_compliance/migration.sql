-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "audit_compliance";

-- CreateTable
CREATE TABLE "audit_compliance"."audit_logs" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" UUID NOT NULL,
    "details" JSONB,
    "metadata" JSONB,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_workspace_timeline_idx" ON "audit_compliance"."audit_logs"("workspace_id", "created_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_entity_timeline_idx" ON "audit_compliance"."audit_logs"("workspace_id", "entity_type", "entity_id", "created_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_actor_timeline_idx" ON "audit_compliance"."audit_logs"("workspace_id", "user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_action_timeline_idx" ON "audit_compliance"."audit_logs"("workspace_id", "action", "created_at" DESC);
