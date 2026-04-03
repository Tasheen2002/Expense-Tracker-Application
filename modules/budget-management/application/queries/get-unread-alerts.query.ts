import { BudgetService } from '../services/budget.service';
import { BudgetAlert } from '../../domain/entities/budget-alert.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

export interface GetUnreadAlertsQuery extends IQuery {
  workspaceId: string;
  limit?: number;
  offset?: number;
}

export class GetUnreadAlertsHandler implements IQueryHandler<
  GetUnreadAlertsQuery,
  QueryResult<PaginatedResult<BudgetAlert>>
> {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(
    query: GetUnreadAlertsQuery
  ): Promise<QueryResult<PaginatedResult<BudgetAlert>>> {
    try {
      const options = {
        limit: query.limit,
        offset: query.offset,
      };

      const result = await this.budgetService.getUnreadAlerts(
        query.workspaceId,
        options
      );
      return QueryResult.success(result);
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
