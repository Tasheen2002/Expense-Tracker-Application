CREATE FUNCTION "budget_management"."check_allocation_category_workspace"()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."category_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM "expense_ledger"."categories" AS category
    JOIN "budget_management"."budgets" AS budget ON budget."id" = NEW."budget_id"
    WHERE category."id" = NEW."category_id"
      AND category."workspace_id" = budget."workspace_id"
    FOR SHARE OF category, budget
  ) THEN
    RAISE EXCEPTION 'Allocation category must belong to the budget workspace'
      USING ERRCODE = '23514', CONSTRAINT = 'budget_allocation_category_workspace';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "budget_allocation_category_workspace_guard"
BEFORE INSERT OR UPDATE OF "budget_id", "category_id"
ON "budget_management"."budget_allocations"
FOR EACH ROW EXECUTE FUNCTION "budget_management"."check_allocation_category_workspace"();

CREATE FUNCTION "budget_management"."check_spending_limit_category_workspace"()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."category_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM "expense_ledger"."categories" AS category
    WHERE category."id" = NEW."category_id"
      AND category."workspace_id" = NEW."workspace_id"
    FOR SHARE OF category
  ) THEN
    RAISE EXCEPTION 'Spending-limit category must belong to its workspace'
      USING ERRCODE = '23514', CONSTRAINT = 'spending_limit_category_workspace';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "spending_limit_category_workspace_guard"
BEFORE INSERT OR UPDATE OF "workspace_id", "category_id"
ON "budget_management"."spending_limits"
FOR EACH ROW EXECUTE FUNCTION "budget_management"."check_spending_limit_category_workspace"();

CREATE FUNCTION "budget_management"."check_category_workspace_move"()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."workspace_id" <> OLD."workspace_id" AND (
    EXISTS (SELECT 1 FROM "budget_management"."budget_allocations"
      WHERE "category_id" = OLD."id")
    OR EXISTS (SELECT 1 FROM "budget_management"."spending_limits"
      WHERE "category_id" = OLD."id")
  ) THEN
    RAISE EXCEPTION 'Referenced category cannot move to another workspace'
      USING ERRCODE = '23514', CONSTRAINT = 'referenced_category_workspace';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "referenced_category_workspace_guard"
BEFORE UPDATE OF "workspace_id" ON "expense_ledger"."categories"
FOR EACH ROW EXECUTE FUNCTION "budget_management"."check_category_workspace_move"();

CREATE FUNCTION "budget_management"."check_budget_workspace_move"()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."workspace_id" <> OLD."workspace_id" AND EXISTS (
    SELECT 1 FROM "budget_management"."budget_allocations"
    WHERE "budget_id" = OLD."id" AND "category_id" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Budget with categorized allocations cannot move to another workspace'
      USING ERRCODE = '23514', CONSTRAINT = 'categorized_budget_workspace';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "categorized_budget_workspace_guard"
BEFORE UPDATE OF "workspace_id" ON "budget_management"."budgets"
FOR EACH ROW EXECUTE FUNCTION "budget_management"."check_budget_workspace_move"();
