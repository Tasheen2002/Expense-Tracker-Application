import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs';
import { OutboxEventService } from '../services/outbox-event.service';
import { OutboxEventDTO } from '../../domain/entities/outbox-event.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface GetFailedEventsQuery extends IQuery {
  maxRetries?: number;
  limit?: number;
  offset?: number;
}

export class GetFailedEventsHandler implements IQueryHandler<GetFailedEventsQuery, PaginatedResult<OutboxEventDTO>> {
  constructor(private readonly service: OutboxEventService) {}

  async handle(query: GetFailedEventsQuery): Promise<PaginatedResult<OutboxEventDTO>> {
    return this.service.getFailedEvents(query.maxRetries, query.limit, query.offset);
  }
}
