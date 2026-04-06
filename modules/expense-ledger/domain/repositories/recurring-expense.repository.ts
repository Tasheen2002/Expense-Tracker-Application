import { RecurringExpense } from "../entities/recurring-expense.entity";
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface RecurringExpenseRepository {
  save(expense: RecurringExpense): Promise<void>;
  findById(id: string): Promise<RecurringExpense | null>;
  findDueExpenses(
    beforeDate: Date,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<RecurringExpense>>;
  delete(id: string): Promise<void>;
}
