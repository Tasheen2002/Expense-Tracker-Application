import { Expense } from '../../domain/entities/expense.entity';

/** Business checks and projections that must commit with an expense approval. */
export interface IApprovedExpensePolicy {
  validate(expense: Expense): Promise<void>;
  synchronize(expense: Expense): Promise<void>;
}
