/**
 * Expense Snapshot Port
 *
 * Defines the contract for fetching authoritative expense details from expense-budgeting-service.
 * The Approval Policy service does NOT own expense data.
 * Directly trusting client-supplied facts (amount, categoryId, hasReceipt) during workflow initiation
 * is prohibited to prevent approval policy evasion and fraud.
 */

export interface ExpenseSnapshot {
  expenseId: string;
  workspaceId: string;
  userId: string;
  amount: number;
  currency: string;
  categoryId?: string;
  merchant?: string;
  description?: string;
  hasReceipt: boolean;
  expenseDate: Date;
  status: string;
}

export interface GetExpenseSnapshotInput {
  workspaceId: string;
  expenseId: string;
  userId: string;
  authToken?: string;
}

export interface IExpenseSnapshotService {
  /**
   * Loads an authoritative snapshot of an expense.
   *
   * @throws Error if expense is not found, does not belong to the workspace, or service is unreachable.
   */
  getExpenseSnapshot(input: GetExpenseSnapshotInput): Promise<ExpenseSnapshot>;
}
