import { BudgetService } from '../services/budget.service';
import { BudgetAlertDTO } from '../../domain/entities/budget-alert.entity';
import {
  PaginatedResult,
  PaginationOptions,
} from '@core/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface GetUnreadAlertsQuery extends IQuery {
  readonly workspaceId: string;
  readonly limit?: number;
  readonly offset?: number;
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
