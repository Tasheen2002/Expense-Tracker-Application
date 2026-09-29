ALTER TABLE "budget_management"."budgets"
  ADD CONSTRAINT "budgets_positive_total_amount" CHECK ("total_amount" > 0),
  ADD CONSTRAINT "budgets_valid_period" CHECK ("end_date" >= "start_date");

ALTER TABLE "budget_management"."budget_allocations"
  ADD CONSTRAINT "budget_allocations_positive_amount" CHECK ("allocated_amount" > 0),
  ADD CONSTRAINT "budget_allocations_nonnegative_spent" CHECK ("spent_amount" >= 0);

ALTER TABLE "budget_management"."budget_alerts"
  ADD CONSTRAINT "budget_alerts_valid_threshold" CHECK ("threshold" BETWEEN 0 AND 100),
  ADD CONSTRAINT "budget_alerts_nonnegative_spent" CHECK ("current_spent" >= 0),
  ADD CONSTRAINT "budget_alerts_positive_allocation" CHECK ("allocated_amount" > 0);

ALTER TABLE "budget_management"."spending_limits"
  ADD CONSTRAINT "spending_limits_positive_amount" CHECK ("limit_amount" > 0);
