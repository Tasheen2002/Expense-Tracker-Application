-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "cost_allocation";

-- CreateTable
CREATE TABLE "cost_allocation"."departments" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "manager_id" UUID,
    "parent_department_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_allocation"."cost_centers" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_allocation"."projects" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "manager_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "budget" DECIMAL(12,2),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_allocation"."expense_allocations" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "expense_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "percentage" DECIMAL(5,2),
    "department_id" UUID,
    "cost_center_id" UUID,
    "project_id" UUID,
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "departments_workspace_id_idx" ON "cost_allocation"."departments"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_workspace_id_code_key" ON "cost_allocation"."departments"("workspace_id", "code");

-- CreateIndex
CREATE INDEX "cost_centers_workspace_id_idx" ON "cost_allocation"."cost_centers"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "cost_centers_workspace_id_code_key" ON "cost_allocation"."cost_centers"("workspace_id", "code");

-- CreateIndex
CREATE INDEX "projects_workspace_id_idx" ON "cost_allocation"."projects"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_workspace_id_code_key" ON "cost_allocation"."projects"("workspace_id", "code");

-- CreateIndex
CREATE INDEX "expense_allocations_expense_id_idx" ON "cost_allocation"."expense_allocations"("expense_id");

-- CreateIndex
CREATE INDEX "expense_allocations_workspace_id_idx" ON "cost_allocation"."expense_allocations"("workspace_id");

-- CreateIndex
CREATE INDEX "expense_allocations_department_id_idx" ON "cost_allocation"."expense_allocations"("department_id");

-- CreateIndex
CREATE INDEX "expense_allocations_cost_center_id_idx" ON "cost_allocation"."expense_allocations"("cost_center_id");

-- CreateIndex
CREATE INDEX "expense_allocations_project_id_idx" ON "cost_allocation"."expense_allocations"("project_id");

-- CreateIndex
CREATE INDEX "expense_allocations_created_by_idx" ON "cost_allocation"."expense_allocations"("created_by");

-- AddForeignKey
ALTER TABLE "cost_allocation"."departments" ADD CONSTRAINT "departments_parent_department_id_fkey" FOREIGN KEY ("parent_department_id") REFERENCES "cost_allocation"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_allocation"."expense_allocations" ADD CONSTRAINT "expense_allocations_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "cost_allocation"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_allocation"."expense_allocations" ADD CONSTRAINT "expense_allocations_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_allocation"."cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_allocation"."expense_allocations" ADD CONSTRAINT "expense_allocations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "cost_allocation"."projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
