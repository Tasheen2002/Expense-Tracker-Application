CREATE TABLE "audit_compliance"."account_audit_logs" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "event_type" VARCHAR(100) NOT NULL,
  "entity_type" VARCHAR(100) NOT NULL,
  "entity_id" UUID NOT NULL,
  "details" JSONB NOT NULL,
  "fingerprint" VARCHAR(64) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "account_audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "account_audit_logs_user_id_created_at_id_idx"
  ON "audit_compliance"."account_audit_logs"("user_id", "created_at" DESC, "id" DESC);
