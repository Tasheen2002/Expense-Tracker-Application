import { SpendingLimitService } from '../services/spending-limit.service';
import { SpendingLimitDTO } from '../../domain/entities/spending-limit.entity';
import { BudgetPeriodType } from '../../domain/enums/budget-period-type';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';

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
  PaginatedResult<SpendingLimitDTO>
> {
  constructor(private readonly spendingLimitService: SpendingLimitService) {}

  async handle(query: ListSpendingLimitsQuery): Promise<PaginatedResult<SpendingLimitDTO>> {
    const options: PaginationOptions = {
      limit: query.limit,
      offset: query.offset,
    };

    if (
      query.userId !== undefined ||
      query.categoryId !== undefined ||
      query.isActive !== undefined ||
      query.periodType
    ) {
      return this.spendingLimitService.filterSpendingLimits(
        {
          workspaceId: query.workspaceId,
          userId: query.userId,
          categoryId: query.categoryId,
          isActive: query.isActive,
          periodType: query.periodType,
        },
        options
      );
    }

    return this.spendingLimitService.getSpendingLimitsByWorkspace(
      query.workspaceId,
      options
    );
  }
}
