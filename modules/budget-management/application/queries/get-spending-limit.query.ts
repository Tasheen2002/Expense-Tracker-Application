import { SpendingLimitService } from '../services/spending-limit.service';
import { SpendingLimitDTO } from '../../domain/entities/spending-limit.entity';
import { SpendingLimitNotFoundError } from '../../domain/errors/budget.errors';
import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';

export interface GetSpendingLimitQuery extends IQuery {
  readonly limitId: string;
  readonly workspaceId: string;
}

export class GetSpendingLimitHandler implements IQueryHandler<
  GetSpendingLimitQuery,
  SpendingLimitDTO
> {
  constructor(private readonly spendingLimitService: SpendingLimitService) {}

  async handle(query: GetSpendingLimitQuery): Promise<SpendingLimitDTO> {
    const dto = await this.spendingLimitService.getSpendingLimitById(
      query.limitId,
      query.workspaceId
    );

    if (!dto) {
      throw new SpendingLimitNotFoundError(query.limitId);
    }

    return dto;
  }
}
