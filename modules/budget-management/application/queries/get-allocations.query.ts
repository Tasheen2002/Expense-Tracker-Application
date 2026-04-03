import { BudgetService } from '../services/budget.service';
import { BudgetAllocation } from '../../domain/entities/budget-allocation.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

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
  }
}
