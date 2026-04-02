import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';
import { IOutboxEventRepository } from '../../domain/repositories/outbox-event.repository';
import { BATCH_SIZE } from '../../domain/constants/outbox.constants';
import { OutboxEvent } from '../../domain/entities/outbox-event.entity';
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';

export interface GetFailedEventsQuery extends IQuery {
  maxRetries?: number;
  limit?: number;
  offset?: number;
}

export class GetFailedEventsHandler implements IQueryHandler<
  GetFailedEventsQuery,
  QueryResult<PaginatedResult<OutboxEvent>>
> {
  constructor(private readonly repository: IOutboxEventRepository) {}

  async handle(
    query: GetFailedEventsQuery
  ): Promise<QueryResult<PaginatedResult<OutboxEvent>>> {
    const limit = query.limit ?? BATCH_SIZE;
    const offset = query.offset ?? 0;
    const maxRetries = query.maxRetries ?? 3;
    const result = await this.repository.findFailedEventsForRetry(maxRetries, {
      limit,
      offset,
    });
    return QueryResult.success(result);
  }
}
