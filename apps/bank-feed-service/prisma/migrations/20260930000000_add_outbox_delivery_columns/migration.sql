-- Keep the migrated outbox table aligned with the delivery state used by the
-- publisher. Existing pending events become immediately eligible for retry.
ALTER TABLE "bank_feed_sync"."outbox_event"
  ADD COLUMN "delivered_to" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "lease_expires_at" TIMESTAMP(3),
  ADD COLUMN "lease_token" TEXT,
  ADD COLUMN "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

