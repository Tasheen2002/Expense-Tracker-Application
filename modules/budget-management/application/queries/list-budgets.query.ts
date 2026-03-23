import { BudgetService } from '../services/budget.service';
import { Budget } from '../../domain/entities/budget.entity';
import { BudgetStatus } from '../../domain/enums/budget-status';
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';

export interface ListBudgetsQuery extends IQuery {
  workspaceId: string;
  status?: BudgetStatus;
  isActive?: boolean;
  createdBy?: string;
  currency?: string;
  limit?: number;
  offset?: number;
}

export class ListBudgetsHandler implements IQueryHandler<
  ListBudgetsQuery,
  QueryResult<PaginatedResult<Budget>>
> {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(
    query: ListBudgetsQuery
  ): Promise<QueryResult<PaginatedResult<Budget>>> {
    try {
      
          const limit = query.limit || 50;
          const offset = query.offset || 0;
      
          let result: PaginatedResult<Budget>;
      
          if (
            query.status ||
            query.isActive !== undefined ||
            query.createdBy ||
            query.currency
          ) {
            result = await this.budgetService.filterBudgets(
              {
                workspaceId: query.workspaceId,
                status: query.status,
                isActive: query.isActive,
                createdBy: query.createdBy,
                currency: query.currency,
              },
              { limit, offset }
            );
          } else {
            result = await this.budgetService.getBudgetsByWorkspace(
              query.workspaceId,
              {
                limit,
                offset,
              }
            );
          }
      
          return QueryResult.success(result);
        
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
