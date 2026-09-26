import { RecurringExpense } from "../entities/recurring-expense.entity";
import { RecurringExpenseId } from "../value-objects/recurring-expense-id";
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';

export interface IRecurringExpenseRepository {
  save(expense: RecurringExpense): Promise<void>;
  findById(id: RecurringExpenseId, workspaceId: string): Promise<RecurringExpense | null>;
  findByWorkspace(
    workspaceId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<RecurringExpense>>;
  /** Worker-level operation: intentionally unscoped to process all tenants. */
  findDueExpenses(
    beforeDate: Date,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<RecurringExpense>>;
  /**
   * Worker-level atomic claim: locks and retrieves the next due recurring expense
   * using FOR UPDATE SKIP LOCKED within an active transaction.
   */
  claimNextDueExpense(
    beforeDate: Date,
    workspaceId?: string
  ): Promise<RecurringExpense | null>;
  /**
   * Worker-level atomic claim by ID: locks and retrieves a specific recurring expense
   * using FOR UPDATE SKIP LOCKED within an active transaction if it is due (status ACTIVE and next_run_date <= beforeDate).
   * Returns null if locked by another transaction, not found, or not due.
   */
  claimById(
    id: RecurringExpenseId,
    workspaceId: string,
    beforeDate?: Date
  ): Promise<RecurringExpense | null>;
  delete(id: RecurringExpenseId, workspaceId: string): Promise<void>;
}
