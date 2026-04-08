import { BudgetService } from '../services/budget.service';
import { BudgetAllocationDTO } from '../../domain/entities/budget-allocation.entity';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
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

export class GetAllocationsHandler
  implements
    IQueryHandler<
      GetAllocationsQuery,
      QueryResult<PaginatedResult<BudgetAllocationDTO>>
    >
{
  constructor(private readonly budgetService: BudgetService) {}

  async handle(
    query: GetAllocationsQuery
  ): Promise<QueryResult<PaginatedResult<BudgetAllocationDTO>>> {
    const options: PaginationOptions = {
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
