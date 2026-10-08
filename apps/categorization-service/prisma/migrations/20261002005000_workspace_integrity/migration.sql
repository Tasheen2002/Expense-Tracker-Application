-- AlterTable
ALTER TABLE "categorization_rules"."category_rules" ADD COLUMN     "deleted_at" TIMESTAMPTZ(6);

-- CreateIndex
CREATE INDEX "category_rules_workspace_id_deleted_at_priority_created_at_idx" ON "categorization_rules"."category_rules"("workspace_id", "deleted_at", "priority" DESC, "created_at");

-- CreateIndex
CREATE INDEX "category_rules_workspace_id_deleted_at_is_active_priority_c_idx" ON "categorization_rules"."category_rules"("workspace_id", "deleted_at", "is_active", "priority" DESC, "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "category_rules_workspace_id_name_key" ON "categorization_rules"."category_rules"("workspace_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "category_rules_id_workspace_id_key" ON "categorization_rules"."category_rules"("id", "workspace_id");

-- CreateIndex
CREATE INDEX "rule_executions_workspace_id_executed_at_idx" ON "categorization_rules"."rule_executions"("workspace_id", "executed_at" DESC);

-- CreateIndex
CREATE INDEX "rule_executions_workspace_id_expense_id_executed_at_idx" ON "categorization_rules"."rule_executions"("workspace_id", "expense_id", "executed_at" DESC);

-- CreateIndex
CREATE INDEX "rule_executions_rule_id_executed_at_idx" ON "categorization_rules"."rule_executions"("rule_id", "executed_at" DESC);

-- CreateIndex
CREATE INDEX "category_suggestions_workspace_id_created_at_idx" ON "categorization_rules"."category_suggestions"("workspace_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "category_suggestions_workspace_id_expense_id_created_at_idx" ON "categorization_rules"."category_suggestions"("workspace_id", "expense_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "category_suggestions_workspace_id_is_accepted_created_at_idx" ON "categorization_rules"."category_suggestions"("workspace_id", "is_accepted", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "categorization_rules"."rule_executions" ADD CONSTRAINT "rule_executions_rule_id_workspace_id_fkey" FOREIGN KEY ("rule_id", "workspace_id") REFERENCES "categorization_rules"."category_rules"("id", "workspace_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
