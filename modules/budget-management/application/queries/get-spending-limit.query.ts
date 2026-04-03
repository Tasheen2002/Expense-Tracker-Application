import { SpendingLimitService } from '../services/spending-limit.service';
import { SpendingLimit } from '../../domain/entities/spending-limit.entity';
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

export class GetSpendingLimitHandler implements IQueryHandler<
  GetSpendingLimitQuery,
  QueryResult<SpendingLimit>
> {
  constructor(private readonly spendingLimitService: SpendingLimitService) {}

  async handle(
    query: GetSpendingLimitQuery
  ): Promise<QueryResult<SpendingLimit>> {
    const limit = await this.spendingLimitService.getSpendingLimitById(
      query.limitId,
      query.workspaceId
    );

    if (!limit) {
      throw new SpendingLimitNotFoundError(query.limitId);
    }

    return QueryResult.success(limit);
  }
}
