import { IBudgetAlertRepository } from '../../domain/repositories/budget-alert.repository';
import {
  BudgetAlert,
  BudgetAlertDTO,
} from '../../domain/entities/budget-alert.entity';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
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

export class GetUnreadAlertsHandler
  implements
    IQueryHandler<
      GetUnreadAlertsQuery,
      QueryResult<PaginatedResult<BudgetAlertDTO>>
    >
{
  constructor(
    private readonly budgetAlertRepository: IBudgetAlertRepository
  ) {}

  async handle(
    query: GetUnreadAlertsQuery
  ): Promise<QueryResult<PaginatedResult<BudgetAlertDTO>>> {
    const options: PaginationOptions = {
      limit: query.limit,
      offset: query.offset,
    };

    const result = await this.budgetAlertRepository.findUnreadAlerts(
      query.workspaceId,
      options
    );

    const dtoResult: PaginatedResult<BudgetAlertDTO> = {
      ...result,
      items: result.items.map((alert) => BudgetAlert.toDTO(alert)),
    };

    return QueryResult.success(dtoResult);
  }
}
