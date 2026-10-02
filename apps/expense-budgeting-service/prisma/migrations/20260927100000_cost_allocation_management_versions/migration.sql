ALTER TABLE "cost_allocation"."departments"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "cost_allocation"."cost_centers"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "cost_allocation"."projects"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
