import { IBudgetRepository } from '../../domain/repositories/budget.repository';
import { IBudgetAllocationRepository } from '../../domain/repositories/budget-allocation.repository';
import {
  BudgetAllocation,
  BudgetAllocationDTO,
} from '../../domain/entities/budget-allocation.entity';
import { BudgetId } from '../../domain/value-objects/budget-id';
import { BudgetNotFoundError } from '../../domain/errors/budget.errors';
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
  constructor(
    private readonly budgetRepository: IBudgetRepository,
    private readonly allocationRepository: IBudgetAllocationRepository
  ) {}

  async handle(
    query: GetAllocationsQuery
  ): Promise<QueryResult<PaginatedResult<BudgetAllocationDTO>>> {
    const budgetId = BudgetId.fromString(query.budgetId);

    const budget = await this.budgetRepository.findById(
      budgetId,
      query.workspaceId
    );
    if (!budget) {
      throw new BudgetNotFoundError(query.budgetId, query.workspaceId);
    }

    const options: PaginationOptions = {
      limit: query.limit,
      offset: query.offset,
    };

    const result = await this.allocationRepository.findByBudget(
      budgetId,
      options
    );

    const dtoResult: PaginatedResult<BudgetAllocationDTO> = {
      ...result,
      items: result.items.map((allocation) =>
        BudgetAllocation.toDTO(allocation)
      ),
    };

    return QueryResult.success(dtoResult);
  }
}
