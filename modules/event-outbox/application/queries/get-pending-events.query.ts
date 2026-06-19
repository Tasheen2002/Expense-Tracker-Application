import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';
import { OutboxEventManagementService } from '../services/outbox-event.service';
import { OutboxEventDTO } from '../../domain/entities/outbox-event.entity';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';

export interface GetPendingEventsQuery extends IQuery {
  readonly limit?: number;
  readonly offset?: number;
}

export class GetPendingEventsHandler
  implements IQueryHandler<GetPendingEventsQuery, PaginatedResult<OutboxEventDTO>>
{
  constructor(private readonly outboxEventService: OutboxEventManagementService) {}

  async handle(query: GetPendingEventsQuery): Promise<PaginatedResult<OutboxEventDTO>> {
    return this.outboxEventService.getPendingEvents(query.limit, query.offset);
  }
}
