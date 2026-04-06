import { IBudgetRepository } from '../../domain/repositories/budget.repository';
import { Budget, BudgetDTO } from '../../domain/entities/budget.entity';
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
  constructor(private readonly budgetRepository: IBudgetRepository) {}

  async handle(
    query: ListBudgetsQuery
  ): Promise<QueryResult<PaginatedResult<BudgetDTO>>> {
    const options: PaginationOptions = {
      limit: query.limit || 50,
      offset: query.offset || 0,
    };

    let result;

    if (
      query.status ||
      query.isActive !== undefined ||
      query.createdBy ||
      query.currency
    ) {
      result = await this.budgetRepository.findByFilters(
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
      result = await this.budgetRepository.findByWorkspace(
        query.workspaceId,
        options
      );
    }

    const dtoResult: PaginatedResult<BudgetDTO> = {
      ...result,
      items: result.items.map((budget) => Budget.toDTO(budget)),
    };

    return QueryResult.success(dtoResult);
  }
}
