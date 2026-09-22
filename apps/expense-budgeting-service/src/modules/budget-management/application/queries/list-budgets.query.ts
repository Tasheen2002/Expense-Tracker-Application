import { BudgetService } from '../services/budget.service';
import { BudgetDTO } from '../../domain/entities/budget.entity';
import { BudgetStatus } from '../../domain/enums/budget-status';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface ListBudgetsQuery extends IQuery {
  readonly workspaceId: string;
  readonly status?: BudgetStatus;
  readonly isActive?: boolean;
  readonly createdBy?: string;
  readonly currency?: string;
  readonly limit?: number;
  readonly offset?: number;
}

export class ListBudgetsHandler implements IQueryHandler<
  ListBudgetsQuery,
  PaginatedResult<BudgetDTO>
> {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(query: ListBudgetsQuery): Promise<PaginatedResult<BudgetDTO>> {
    const options: PaginationOptions = {
      limit: query.limit || 50,
      offset: query.offset || 0,
    };

    if (
      query.status ||
      query.isActive !== undefined ||
      query.createdBy ||
      query.currency
    ) {
      return this.budgetService.filterBudgets(
        {
          workspaceId: query.workspaceId,
          status: query.status,
          isActive: query.isActive,
          createdBy: query.createdBy,
          currency: query.currency,
        },
        options
      );
    }

    return this.budgetService.getBudgetsByWorkspace(query.workspaceId, options);
  }
}
