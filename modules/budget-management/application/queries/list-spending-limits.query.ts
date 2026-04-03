import { SpendingLimitService } from '../services/spending-limit.service';
import { SpendingLimit } from '../../domain/entities/spending-limit.entity';
import { BudgetPeriodType } from '../../domain/enums/budget-period-type';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

export interface ListSpendingLimitsQuery extends IQuery {
  workspaceId: string;
  userId?: string;
  categoryId?: string;
  isActive?: boolean;
  periodType?: BudgetPeriodType;
  limit?: number;
  offset?: number;
}

export class ListSpendingLimitsHandler implements IQueryHandler<
  ListSpendingLimitsQuery,
  QueryResult<PaginatedResult<SpendingLimit>>
> {
  constructor(private readonly limitService: SpendingLimitService) {}

  async handle(
    query: ListSpendingLimitsQuery
  ): Promise<QueryResult<PaginatedResult<SpendingLimit>>> {
    try {
      const options = {
        limit: query.limit,
        offset: query.offset,
      };

      let result: PaginatedResult<SpendingLimit>;

      if (
        query.userId !== undefined ||
        query.categoryId !== undefined ||
        query.isActive !== undefined ||
        query.periodType
      ) {
        result = await this.limitService.filterSpendingLimits(
          {
            workspaceId: query.workspaceId,
            userId: query.userId,
            categoryId: query.categoryId,
            isActive: query.isActive,
            periodType: query.periodType,
          },
          options
        );
      } else {
        result = await this.limitService.getSpendingLimitsByWorkspace(
          query.workspaceId,
          options
        );
      }

      return QueryResult.success(result);
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
