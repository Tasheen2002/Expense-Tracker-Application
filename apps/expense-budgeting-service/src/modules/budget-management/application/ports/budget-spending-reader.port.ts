import { Budget } from '../../domain/entities/budget.entity';

/** Canonical approved expense total for one budget allocation scope. */
export interface IBudgetSpendingReader {
  total(budget: Budget, categoryId: string | null): Promise<string>;
}
