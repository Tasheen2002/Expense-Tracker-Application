import { RecurringExpense } from "../entities/recurring-expense.entity";

export interface RecurringExpenseRepository {
  save(expense: RecurringExpense): Promise<void>;
  findById(id: string): Promise<RecurringExpense | null>;
  findDueExpenses(beforeDate: Date): Promise<RecurringExpense[]>;
  delete(id: string): Promise<void>;
}
