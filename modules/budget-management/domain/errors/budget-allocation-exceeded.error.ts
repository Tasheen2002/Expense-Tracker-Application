export class BudgetAllocationExceededError extends Error {
  constructor(budgetId: string, budgetTotal: number, attemptedTotal: number) {
    super(
      `Budget allocation exceeded. Budget total: ${budgetTotal}, Attempted total: ${attemptedTotal}`,
    );
    this.name = "BudgetAllocationExceededError";
  }
}
