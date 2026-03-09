import { BudgetService } from '../services/budget.service';
import { Budget } from '../../domain/entities/budget.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';

export interface GetBudgetQuery extends IQuery {
  budgetId: string;
  workspaceId: string;
}

export class GetBudgetHandler implements IQueryHandler<
  GetBudgetQuery,
  QueryResult<Budget>
> {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(query: GetBudgetQuery): Promise<QueryResult<Budget>> {
    const budget = await this.budgetService.getBudgetById(
      query.budgetId,
      query.workspaceId
    );
    if (!budget) {
      return QueryResult.failure<Budget>('Budget not found');
    }
    return QueryResult.success(budget);
  }
}
