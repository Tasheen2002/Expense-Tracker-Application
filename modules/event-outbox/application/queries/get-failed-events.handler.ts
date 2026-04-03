import { IOutboxEventRepository } from "../../domain/repositories/outbox-event.repository";
import { BATCH_SIZE } from "../../domain/constants/outbox.constants";
import { GetFailedEventsQuery } from "./get-failed-events.query";
import { OutboxEvent } from "../../domain/entities/outbox-event.entity";
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export class GetFailedEventsHandler {
  constructor(private readonly repository: IOutboxEventRepository) {}

  async handle(
    query: GetFailedEventsQuery,
  ): Promise<PaginatedResult<OutboxEvent>> {
    const limit = query.limit || BATCH_SIZE;
    const offset = query.offset || 0;
    const maxRetries = query.maxRetries || 3;
    return await this.repository.findFailedEventsForRetry(maxRetries, {
      limit,
      offset,
    });
  }
}
