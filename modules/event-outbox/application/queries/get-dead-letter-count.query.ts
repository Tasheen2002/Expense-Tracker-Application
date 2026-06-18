import {
  IQuery,
  IQueryHandler,
} from '@core/application/cqrs';
import { OutboxEventManagementService } from '../services/outbox-event.service';

export interface GetDeadLetterCountQuery extends IQuery {}

export class GetDeadLetterCountHandler
  implements IQueryHandler<GetDeadLetterCountQuery, { count: number }>
{
  constructor(private readonly outboxEventService: OutboxEventManagementService) {}

  async handle(_query: GetDeadLetterCountQuery): Promise<{ count: number }> {
    const count = await this.outboxEventService.getDeadLetterCount();
    return { count };
  }
}
