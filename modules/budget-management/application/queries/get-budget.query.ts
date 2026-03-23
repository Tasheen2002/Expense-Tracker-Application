import { BudgetService } from '../services/budget.service';
import { Budget } from '../../domain/entities/budget.entity';
import { BudgetNotFoundError } from '../../domain/errors/budget.errors';
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
    try {
      
          const budget = await this.budgetService.getBudgetById(
            query.budgetId,
            query.workspaceId
          );
          if (!budget) {
            throw new BudgetNotFoundError(query.budgetId, query.workspaceId);
          }
          return QueryResult.success(budget);
        
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
