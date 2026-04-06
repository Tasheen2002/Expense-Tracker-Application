import { ISpendingLimitRepository } from '../../domain/repositories/spending-limit.repository';
import {
  SpendingLimit,
  SpendingLimitDTO,
} from '../../domain/entities/spending-limit.entity';
import { SpendingLimitId } from '../../domain/value-objects/spending-limit-id';
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
  constructor(
    private readonly spendingLimitRepository: ISpendingLimitRepository
  ) {}

  async handle(
    query: GetSpendingLimitQuery
  ): Promise<QueryResult<SpendingLimitDTO>> {
    const limit = await this.spendingLimitRepository.findById(
      SpendingLimitId.fromString(query.limitId),
      query.workspaceId
    );

    if (!limit) {
      throw new SpendingLimitNotFoundError(query.limitId);
    }

    return QueryResult.success(SpendingLimit.toDTO(limit));
  }
}
