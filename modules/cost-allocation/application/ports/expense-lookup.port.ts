import { Decimal } from "@prisma/client/runtime/library";

/**
 * Expense data required for cost allocation validation.
 * This is a read-only projection of expense data.
 */
export interface ExpenseAllocationData {
  id: string;
  workspaceId: string;
  amount: Decimal;
}

/**
 * Port for looking up expense data needed by cost allocation.
 * This interface decouples the application layer from the infrastructure.
 */
export interface IExpenseLookupPort {
  /**
   * Find expense data for allocation validation.
   * Returns null if expense does not exist.
   */
  findExpenseForAllocation(
    expenseId: string,
  ): Promise<ExpenseAllocationData | null>;
}
