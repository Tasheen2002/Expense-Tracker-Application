-- Preserve existing data: validation fails if any relationship crosses workspaces.
-- Never infer ownership or silently delete inconsistent records during migration.
BEGIN;

CREATE UNIQUE INDEX "approval_chains_workspace_id_id_key"
  ON "approval_workflow"."approval_chains"("workspace_id", "id");
CREATE UNIQUE INDEX "expense_policies_workspace_id_id_key"
  ON "policy_controls"."expense_policies"("workspace_id", "id");

ALTER TABLE "approval_workflow"."expense_workflows"
  DROP CONSTRAINT "expense_workflows_chain_id_fkey",
  ADD CONSTRAINT "expense_workflows_workspace_id_chain_id_fkey"
    FOREIGN KEY ("workspace_id", "chain_id")
    REFERENCES "approval_workflow"."approval_chains"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "policy_controls"."policy_violations"
  DROP CONSTRAINT "policy_violations_policy_id_fkey",
  ADD CONSTRAINT "policy_violations_workspace_id_policy_id_fkey"
    FOREIGN KEY ("workspace_id", "policy_id")
    REFERENCES "policy_controls"."expense_policies"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "policy_controls"."policy_exemptions"
  DROP CONSTRAINT "policy_exemptions_policy_id_fkey",
  ADD CONSTRAINT "policy_exemptions_workspace_id_policy_id_fkey"
    FOREIGN KEY ("workspace_id", "policy_id")
    REFERENCES "policy_controls"."expense_policies"("workspace_id", "id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
