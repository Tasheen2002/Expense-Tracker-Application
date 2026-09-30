-- Match Prisma's compound unique selector. Retain the existing LOWER(name)
-- expression index, which also prevents case-insensitive duplicates.
CREATE UNIQUE INDEX "expense_policies_workspace_id_name_key"
ON "policy_controls"."expense_policies"("workspace_id", "name");
