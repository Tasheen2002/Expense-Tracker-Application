CREATE TABLE "notification_dispatch"."account_notification_requests" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "fingerprint" VARCHAR(64) NOT NULL,
  "suppressed" BOOLEAN NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "account_notification_requests_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "notification_dispatch"."account_notifications" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "event_type" VARCHAR(100) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "content" TEXT NOT NULL,
  "read_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "account_notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "account_notifications_user_id_created_at_id_idx"
  ON "notification_dispatch"."account_notifications"("user_id", "created_at" DESC, "id" DESC);
CREATE UNIQUE INDEX "account_notification_requests_id_user_id_key"
  ON "notification_dispatch"."account_notification_requests"("id", "user_id");
CREATE UNIQUE INDEX "account_notifications_id_user_id_key"
  ON "notification_dispatch"."account_notifications"("id", "user_id");
ALTER TABLE "notification_dispatch"."account_notifications" ADD CONSTRAINT "account_notifications_id_user_id_fkey"
  FOREIGN KEY ("id", "user_id") REFERENCES "notification_dispatch"."account_notification_requests"("id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "notification_dispatch"."account_notification_preferences" (
  "user_id" UUID NOT NULL,
  "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
  "type_settings" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "account_notification_preferences_pkey" PRIMARY KEY ("user_id")
);
