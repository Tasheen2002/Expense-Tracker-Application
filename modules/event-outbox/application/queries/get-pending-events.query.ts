import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';
import { IOutboxEventRepository } from '../../domain/repositories/outbox-event.repository';
import { BATCH_SIZE } from '../../domain/constants/outbox.constants';
import { OutboxEvent } from '../../domain/entities/outbox-event.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface GetPendingEventsQuery extends IQuery {
  limit?: number;
  offset?: number;
}

export class GetPendingEventsHandler implements IQueryHandler<
  GetPendingEventsQuery,
  QueryResult<PaginatedResult<OutboxEvent>>
> {
  constructor(private readonly repository: IOutboxEventRepository) {}

  async handle(
    query: GetPendingEventsQuery
  ): Promise<QueryResult<PaginatedResult<OutboxEvent>>> {
    const limit = query.limit ?? BATCH_SIZE;
    const offset = query.offset ?? 0;
    const result = await this.repository.findPendingEvents({ limit, offset });
    return QueryResult.success(result);
  }
}
