import { BudgetService } from '../services/budget.service';
import { BudgetAlertDTO } from '../../domain/entities/budget-alert.entity';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';

export interface GetUnreadAlertsQuery extends IQuery {
  workspaceId: string;
  limit?: number;
  offset?: number;
}

export class GetUnreadAlertsHandler implements IQueryHandler<
  GetUnreadAlertsQuery,
  PaginatedResult<BudgetAlertDTO>
> {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(query: GetUnreadAlertsQuery): Promise<PaginatedResult<BudgetAlertDTO>> {
    const options: PaginationOptions = {
      limit: query.limit,
      offset: query.offset,
    };

    return this.budgetService.getUnreadAlerts(query.workspaceId, options);
  }
}
