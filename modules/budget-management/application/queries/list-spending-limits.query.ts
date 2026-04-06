import { ISpendingLimitRepository } from '../../domain/repositories/spending-limit.repository';
import {
  SpendingLimit,
  SpendingLimitDTO,
} from '../../domain/entities/spending-limit.entity';
import { BudgetPeriodType } from '../../domain/enums/budget-period-type';
import {
  PaginatedResult,
  PaginationOptions,
} from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
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

export class ListSpendingLimitsHandler
  implements
    IQueryHandler<
      ListSpendingLimitsQuery,
      QueryResult<PaginatedResult<SpendingLimitDTO>>
    >
{
  constructor(
    private readonly spendingLimitRepository: ISpendingLimitRepository
  ) {}

  async handle(
    query: ListSpendingLimitsQuery
  ): Promise<QueryResult<PaginatedResult<SpendingLimitDTO>>> {
    const options: PaginationOptions = {
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
      result = await this.spendingLimitRepository.findByFilters(
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
      result = await this.spendingLimitRepository.findByWorkspace(
        query.workspaceId,
        options
      );
    }

    const dtoResult: PaginatedResult<SpendingLimitDTO> = {
      ...result,
      items: result.items.map((limit) => SpendingLimit.toDTO(limit)),
    };

    return QueryResult.success(dtoResult);
  }
}
