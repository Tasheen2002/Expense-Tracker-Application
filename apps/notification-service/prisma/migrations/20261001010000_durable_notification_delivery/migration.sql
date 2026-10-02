CREATE TABLE "notification_dispatch"."notification_requests" (
  "id" UUID PRIMARY KEY,
  "kind" VARCHAR(16) NOT NULL CHECK ("kind" IN ('COMMAND', 'WEBHOOK')),
  "fingerprint" VARCHAR(64) NOT NULL,
  "workspace_id" UUID NOT NULL,
  "recipient_id" UUID NOT NULL,
  "notification_ids" UUID[] NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "notification_requests_workspace_id_idx" ON "notification_dispatch"."notification_requests"("workspace_id");
CREATE TABLE "notification_dispatch"."email_deliveries" (
  "notification_id" UUID PRIMARY KEY REFERENCES "notification_dispatch"."notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED', 'RECONCILIATION_REQUIRED')),
  "attempts" INTEGER NOT NULL DEFAULT 0 CHECK ("attempts" >= 0),
  "lease_token" UUID,
  "lease_expires_at" TIMESTAMPTZ(6),
  "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "message" JSONB,
  "provider" VARCHAR(32),
  "first_attempt_at" TIMESTAMPTZ(6),
  "retry_deadline" TIMESTAMPTZ(6),
  "error" TEXT
);
CREATE INDEX "email_deliveries_status_next_attempt_at_lease_expires_at_idx" ON "notification_dispatch"."email_deliveries"("status", "next_attempt_at", "lease_expires_at");
-- Existing email intent may already have reached a provider. Never blindly resend
-- historical records whose original provider/idempotency window is unknown.
INSERT INTO "notification_dispatch"."email_deliveries" ("notification_id", "status", "error")
SELECT "id", 'RECONCILIATION_REQUIRED', 'Legacy pending delivery: provider outcome and retry window are unknown'
FROM "notification_dispatch"."notifications"
WHERE "channel" = 'EMAIL' AND "sent_at" IS NULL AND "error" IS NULL AND "status" IN ('PENDING', 'READ');
