ALTER TABLE notification_dispatch.notifications ADD COLUMN revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0);
ALTER TABLE notification_dispatch.notification_templates ADD COLUMN revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0);
ALTER TABLE notification_dispatch.notification_preferences ADD COLUMN revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0);
