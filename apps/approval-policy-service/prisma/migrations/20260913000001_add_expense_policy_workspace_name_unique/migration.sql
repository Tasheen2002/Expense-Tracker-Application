-- CreateIndex
CREATE UNIQUE INDEX "expense_policies_workspace_id_lower_name_idx" ON "policy_controls"."expense_policies"("workspace_id", LOWER("name"));
