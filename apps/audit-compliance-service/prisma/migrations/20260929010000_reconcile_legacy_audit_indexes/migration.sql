-- Existing installations may have been created with Prisma db push before
-- migration history was introduced. After baselining the initial migration,
-- this migration replaces their original indexes with workspace-scoped ones.
-- It is harmless on fresh databases, where the initial migration already
-- created the new indexes.
CREATE INDEX IF NOT EXISTS "audit_logs_workspace_timeline_idx"
  ON "audit_compliance"."audit_logs"("workspace_id", "created_at" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "audit_logs_entity_timeline_idx"
  ON "audit_compliance"."audit_logs"("workspace_id", "entity_type", "entity_id", "created_at" DESC, "id" DESC);

CREATE INDEX IF NOT EXISTS "audit_logs_actor_timeline_idx"
  ON "audit_compliance"."audit_logs"("workspace_id", "user_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "audit_logs_action_timeline_idx"
  ON "audit_compliance"."audit_logs"("workspace_id", "action", "created_at" DESC);

DROP INDEX IF EXISTS "audit_compliance"."audit_logs_workspace_id_idx";
DROP INDEX IF EXISTS "audit_compliance"."audit_logs_entity_type_entity_id_idx";
DROP INDEX IF EXISTS "audit_compliance"."audit_logs_created_at_idx";
