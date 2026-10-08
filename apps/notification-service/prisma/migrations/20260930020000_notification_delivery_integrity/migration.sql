-- Global templates have the same one-per-type/channel contract as tenant templates.
-- Fail rather than silently deleting existing duplicate template content.
CREATE UNIQUE INDEX "notification_templates_global_type_channel_key"
ON "notification_dispatch"."notification_templates" ("type", "channel")
WHERE "workspace_id" IS NULL;

ALTER TABLE "notification_dispatch"."notifications"
ADD COLUMN "source_event_fingerprint" VARCHAR(64);

ALTER TABLE "notification_dispatch"."outbox_event"
ADD COLUMN "delivered_to" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "lease_token" TEXT,
ADD COLUMN "lease_expires_at" TIMESTAMP(3),
ADD COLUMN "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Legacy PROCESSING rows have no owner lease and must be retried after upgrading.
UPDATE "notification_dispatch"."outbox_event" SET "status" = 'PENDING'
WHERE "status" = 'PROCESSING';

CREATE INDEX "outbox_event_status_lease_expires_at_idx"
ON "notification_dispatch"."outbox_event" ("status", "lease_expires_at");
CREATE INDEX "outbox_event_status_next_attempt_at_idx"
ON "notification_dispatch"."outbox_event" ("status", "next_attempt_at");
