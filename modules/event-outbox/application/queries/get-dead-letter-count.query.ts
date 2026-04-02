import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';
import { OutboxEventService } from '../services/outbox-event.service';

export interface GetDeadLetterCountQuery extends IQuery {}

export class GetDeadLetterCountHandler implements IQueryHandler<
  GetDeadLetterCountQuery,
  QueryResult<{ count: number }>
> {
  constructor(private readonly service: OutboxEventService) {}

  async handle(
    _query: GetDeadLetterCountQuery
  ): Promise<QueryResult<{ count: number }>> {
    const count = await this.service.getDeadLetterCount();
    return QueryResult.success({ count });
  }
}
