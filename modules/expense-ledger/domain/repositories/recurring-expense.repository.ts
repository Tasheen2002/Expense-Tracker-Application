import { RecurringExpense } from "../entities/recurring-expense.entity";
import { RecurringExpenseId } from "../value-objects/recurring-expense-id";
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface IRecurringExpenseRepository {
  save(expense: RecurringExpense): Promise<void>;
  findById(id: RecurringExpenseId): Promise<RecurringExpense | null>;
  findDueExpenses(
    beforeDate: Date,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<RecurringExpense>>;
  delete(id: RecurringExpenseId): Promise<void>;
}
