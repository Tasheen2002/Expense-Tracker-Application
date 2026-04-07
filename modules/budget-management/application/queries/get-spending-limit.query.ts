import { SpendingLimitService } from '../services/spending-limit.service';
import { SpendingLimitDTO } from '../../domain/entities/spending-limit.entity';
import { SpendingLimitNotFoundError } from '../../domain/errors/budget.errors';
import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { QueryResult } from '../../../../packages/core/src/application/query-result';

export interface GetSpendingLimitQuery extends IQuery {
  limitId: string;
  workspaceId: string;
}

export class GetSpendingLimitHandler
  implements
    IQueryHandler<GetSpendingLimitQuery, QueryResult<SpendingLimitDTO>>
{
  constructor(private readonly spendingLimitService: SpendingLimitService) {}

  async handle(
    query: GetSpendingLimitQuery
  ): Promise<QueryResult<SpendingLimitDTO>> {
    const dto = await this.spendingLimitService.getSpendingLimitById(
      query.limitId,
      query.workspaceId
    );

    if (!dto) {
      throw new SpendingLimitNotFoundError(query.limitId);
    }

    return QueryResult.success(dto);
  }
}
