import {
  IQuery,
  IQueryHandler,
} from '../../../../packages/core/src/application/cqrs';
import { OutboxEventManagementService } from '../services/outbox-event.service';
import { OutboxEventDTO } from '../../domain/entities/outbox-event.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export interface GetFailedEventsQuery extends IQuery {
  readonly maxRetries?: number;
  readonly limit?: number;
  readonly offset?: number;
}

export class GetFailedEventsHandler
  implements IQueryHandler<GetFailedEventsQuery, PaginatedResult<OutboxEventDTO>>
{
  constructor(private readonly outboxEventService: OutboxEventManagementService) {}

  async handle(query: GetFailedEventsQuery): Promise<PaginatedResult<OutboxEventDTO>> {
    return this.outboxEventService.getFailedEvents(query.maxRetries, query.limit, query.offset);
  }
}
