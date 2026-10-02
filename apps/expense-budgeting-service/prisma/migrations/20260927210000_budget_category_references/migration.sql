ALTER TABLE "budget_management"."budget_allocations"
  ADD CONSTRAINT "budget_allocations_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "expense_ledger"."categories"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "budget_management"."spending_limits"
  ADD CONSTRAINT "spending_limits_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "expense_ledger"."categories"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
