-- AlterTable budget_plans: add version and temporal indexes
ALTER TABLE "budget_planning"."budget_plans" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable forecasts: add workspace_id with safe backfill from budget_plans
ALTER TABLE "budget_planning"."forecasts" ADD COLUMN "workspace_id" UUID;

UPDATE "budget_planning"."forecasts" f
SET "workspace_id" = p."workspace_id"
FROM "budget_planning"."budget_plans" p
WHERE f."plan_id" = p."id";

ALTER TABLE "budget_planning"."forecasts" ALTER COLUMN "workspace_id" SET NOT NULL;

-- AlterTable scenarios: add workspace_id with safe backfill from budget_plans
ALTER TABLE "budget_planning"."scenarios" ADD COLUMN "workspace_id" UUID;

UPDATE "budget_planning"."scenarios" s
SET "workspace_id" = p."workspace_id"
FROM "budget_planning"."budget_plans" p
WHERE s."plan_id" = p."id";

ALTER TABLE "budget_planning"."scenarios" ALTER COLUMN "workspace_id" SET NOT NULL;

-- AlterTable forecast_items: add workspace_id with safe backfill from forecasts
ALTER TABLE "budget_planning"."forecast_items" ADD COLUMN "workspace_id" UUID;

UPDATE "budget_planning"."forecast_items" fi
SET "workspace_id" = f."workspace_id"
FROM "budget_planning"."forecasts" f
WHERE fi."forecast_id" = f."id";

ALTER TABLE "budget_planning"."forecast_items" ALTER COLUMN "workspace_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "budget_plans_workspace_id_created_at_idx" ON "budget_planning"."budget_plans"("workspace_id", "created_at");
CREATE INDEX "budget_plans_workspace_id_start_date_end_date_idx" ON "budget_planning"."budget_plans"("workspace_id", "start_date", "end_date");
CREATE INDEX "forecasts_workspace_id_idx" ON "budget_planning"."forecasts"("workspace_id");
CREATE INDEX "scenarios_workspace_id_idx" ON "budget_planning"."scenarios"("workspace_id");
CREATE INDEX "forecast_items_workspace_id_idx" ON "budget_planning"."forecast_items"("workspace_id");

-- CreateUniqueIndex for composite foreign keys
CREATE UNIQUE INDEX "budget_plans_id_workspace_id_key" ON "budget_planning"."budget_plans"("id", "workspace_id");
CREATE UNIQUE INDEX "forecasts_id_workspace_id_key" ON "budget_planning"."forecasts"("id", "workspace_id");

-- Drop old single-column foreign keys
ALTER TABLE "budget_planning"."forecasts" DROP CONSTRAINT IF EXISTS "forecasts_plan_id_fkey";
ALTER TABLE "budget_planning"."scenarios" DROP CONSTRAINT IF EXISTS "scenarios_plan_id_fkey";
ALTER TABLE "budget_planning"."forecast_items" DROP CONSTRAINT IF EXISTS "forecast_items_forecast_id_fkey";

-- Add composite foreign keys enforcing workspace boundary
ALTER TABLE "budget_planning"."forecasts" ADD CONSTRAINT "forecasts_plan_id_workspace_id_fkey" FOREIGN KEY ("plan_id", "workspace_id") REFERENCES "budget_planning"."budget_plans"("id", "workspace_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "budget_planning"."scenarios" ADD CONSTRAINT "scenarios_plan_id_workspace_id_fkey" FOREIGN KEY ("plan_id", "workspace_id") REFERENCES "budget_planning"."budget_plans"("id", "workspace_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "budget_planning"."forecast_items" ADD CONSTRAINT "forecast_items_forecast_id_workspace_id_fkey" FOREIGN KEY ("forecast_id", "workspace_id") REFERENCES "budget_planning"."forecasts"("id", "workspace_id") ON DELETE CASCADE ON UPDATE CASCADE;
