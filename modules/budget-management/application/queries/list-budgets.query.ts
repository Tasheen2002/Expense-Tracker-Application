import { BudgetService } from '../services/budget.service';
import { BudgetDTO } from '../../domain/entities/budget.entity';
import { BudgetStatus } from '../../domain/enums/budget-status';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

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
  QueryResult<PaginatedResult<BudgetDTO>>
> {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(
    query: ListBudgetsQuery
  ): Promise<QueryResult<PaginatedResult<BudgetDTO>>> {
    const options: PaginationOptions = {
      limit: query.limit || 50,
      offset: query.offset || 0,
    };

    let result: PaginatedResult<BudgetDTO>;

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
        options
      );
    } else {
      result = await this.budgetService.getBudgetsByWorkspace(
        query.workspaceId,
        options
      );
    }

    return QueryResult.success(result);
  }
}
