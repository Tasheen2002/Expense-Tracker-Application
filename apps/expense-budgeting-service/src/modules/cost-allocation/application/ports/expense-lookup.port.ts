import Decimal from 'decimal.js';

export interface ExpenseAllocationData {
  id: string;
  workspaceId: string;
  amount: Decimal;
}

export interface IExpenseLookupPort {
  /** Returns null when the expense does not exist in this workspace; propagates persistence failures. */
  findExpenseForAllocation(
    expenseId: string,
    workspaceId: string,
  ): Promise<ExpenseAllocationData | null>;
}
