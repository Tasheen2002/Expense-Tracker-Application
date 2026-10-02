-- A parent department must belong to the same workspace as its child.
ALTER TABLE "cost_allocation"."departments"
  DROP CONSTRAINT "departments_parent_department_id_fkey";

ALTER TABLE "cost_allocation"."departments"
  ADD CONSTRAINT "departments_parent_department_id_workspace_id_fkey"
  FOREIGN KEY ("parent_department_id", "workspace_id")
  REFERENCES "cost_allocation"."departments"("id", "workspace_id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "cost_allocation"."departments"
  ADD CONSTRAINT "departments_not_own_parent"
  CHECK ("parent_department_id" IS NULL OR "parent_department_id" <> "id");

ALTER TABLE "cost_allocation"."projects"
  ADD CONSTRAINT "projects_valid_date_range"
  CHECK ("end_date" IS NULL OR "end_date" >= "start_date"),
  ADD CONSTRAINT "projects_nonnegative_budget"
  CHECK ("budget" IS NULL OR "budget" >= 0);
