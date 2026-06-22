import { BudgetService } from '../services/budget.service';
import { BudgetAllocationDTO } from '../../domain/entities/budget-allocation.entity';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface GetAllocationsQuery extends IQuery {
  readonly budgetId: string;
  readonly workspaceId: string;
  readonly limit?: number;
  readonly offset?: number;
}

export class GetAllocationsHandler implements IQueryHandler<
  GetAllocationsQuery,
  PaginatedResult<BudgetAllocationDTO>
> {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(query: GetAllocationsQuery): Promise<PaginatedResult<BudgetAllocationDTO>> {
    const options: PaginationOptions = {
      limit: query.limit,
      offset: query.offset,
    };

    return this.budgetService.getAllocationsByBudget(
      query.budgetId,
      query.workspaceId,
      options
    );
  }
}
