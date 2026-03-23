import { BudgetService } from '../services/budget.service';
import { BudgetAllocation } from '../../domain/entities/budget-allocation.entity';
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../apps/api/src/shared/application';

export interface GetAllocationsQuery extends IQuery {
  budgetId: string;
  workspaceId: string;
  limit?: number;
  offset?: number;
}

export class GetAllocationsHandler implements IQueryHandler<
  GetAllocationsQuery,
  QueryResult<PaginatedResult<BudgetAllocation>>
> {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(
    query: GetAllocationsQuery
  ): Promise<QueryResult<PaginatedResult<BudgetAllocation>>> {
    try {
      
          const options = {
            limit: query.limit,
            offset: query.offset,
          };
      
          const result = await this.budgetService.getAllocationsByBudget(
            query.budgetId,
            query.workspaceId,
            options
          );
          return QueryResult.success(result);
        
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
