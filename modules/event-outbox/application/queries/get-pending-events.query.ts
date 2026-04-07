import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';
import { OutboxEventService } from '../services/outbox-event.service';
import { OutboxEventDTO } from '../../domain/entities/outbox-event.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface GetPendingEventsQuery extends IQuery {
  limit?: number;
  offset?: number;
}

export class GetPendingEventsHandler implements IQueryHandler<
  GetPendingEventsQuery,
  QueryResult<PaginatedResult<OutboxEventDTO>>
> {
  constructor(private readonly service: OutboxEventService) {}

  async handle(
    query: GetPendingEventsQuery
  ): Promise<QueryResult<PaginatedResult<OutboxEventDTO>>> {
    const result = await this.service.getPendingEvents(query.limit, query.offset);
    return QueryResult.success(result);
  }
}
