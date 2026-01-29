import { BudgetManagementError } from "./budget.errors";

export class BudgetAllocationExceededError extends BudgetManagementError {
  constructor(budgetId: string, budgetTotal: number, attemptedTotal: number) {
    super(
      `Budget allocation exceeded. Budget total: ${budgetTotal}, Attempted total: ${attemptedTotal}`,
      "BUDGET_ALLOCATION_EXCEEDED",
      400,
    );
  }
}
