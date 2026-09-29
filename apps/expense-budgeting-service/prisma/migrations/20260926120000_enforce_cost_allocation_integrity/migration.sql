-- Composite keys make the workspace part of every allocation reference.
CREATE UNIQUE INDEX "expenses_id_workspace_id_key" ON "expense_ledger"."expenses"("id", "workspace_id");
CREATE UNIQUE INDEX "departments_id_workspace_id_key" ON "cost_allocation"."departments"("id", "workspace_id");
CREATE UNIQUE INDEX "cost_centers_id_workspace_id_key" ON "cost_allocation"."cost_centers"("id", "workspace_id");
CREATE UNIQUE INDEX "projects_id_workspace_id_key" ON "cost_allocation"."projects"("id", "workspace_id");

ALTER TABLE "cost_allocation"."expense_allocations" DROP CONSTRAINT "expense_allocations_department_id_fkey";
ALTER TABLE "cost_allocation"."expense_allocations" DROP CONSTRAINT "expense_allocations_cost_center_id_fkey";
ALTER TABLE "cost_allocation"."expense_allocations" DROP CONSTRAINT "expense_allocations_project_id_fkey";

ALTER TABLE "cost_allocation"."expense_allocations"
  ADD CONSTRAINT "expense_allocations_expense_id_workspace_id_fkey"
  FOREIGN KEY ("expense_id", "workspace_id")
  REFERENCES "expense_ledger"."expenses"("id", "workspace_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cost_allocation"."expense_allocations"
  ADD CONSTRAINT "expense_allocations_department_id_workspace_id_fkey"
  FOREIGN KEY ("department_id", "workspace_id")
  REFERENCES "cost_allocation"."departments"("id", "workspace_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cost_allocation"."expense_allocations"
  ADD CONSTRAINT "expense_allocations_cost_center_id_workspace_id_fkey"
  FOREIGN KEY ("cost_center_id", "workspace_id")
  REFERENCES "cost_allocation"."cost_centers"("id", "workspace_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cost_allocation"."expense_allocations"
  ADD CONSTRAINT "expense_allocations_project_id_workspace_id_fkey"
  FOREIGN KEY ("project_id", "workspace_id")
  REFERENCES "cost_allocation"."projects"("id", "workspace_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "cost_allocation"."expense_allocations"
  ADD CONSTRAINT "expense_allocations_amount_positive" CHECK ("amount" > 0),
  ADD CONSTRAINT "expense_allocations_one_target" CHECK (
    ("department_id" IS NOT NULL)::integer +
    ("cost_center_id" IS NOT NULL)::integer +
    ("project_id" IS NOT NULL)::integer = 1
  ),
  ADD CONSTRAINT "expense_allocations_percentage_range" CHECK (
    "percentage" IS NULL OR ("percentage" >= 0 AND "percentage" <= 100)
  );
