import { IOutboxEventRepository } from "../../domain/repositories/outbox-event.repository";
import { BATCH_SIZE } from "../../domain/constants/outbox.constants";
import { OutboxEvent } from "../../domain/entities/outbox-event.entity";
import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface ProcessPendingEventsQuery {
  limit?: number;
  offset?: number;
}

export class ProcessPendingEventsHandler {
  constructor(private readonly repository: IOutboxEventRepository) {}

  async handle(
    query: ProcessPendingEventsQuery,
  ): Promise<PaginatedResult<OutboxEvent>> {
    const limit = query.limit || BATCH_SIZE;
    const offset = query.offset || 0;
    return await this.repository.findPendingEvents({ limit, offset });
  }
}
