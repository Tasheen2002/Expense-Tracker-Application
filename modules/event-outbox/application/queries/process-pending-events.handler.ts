import { IOutboxEventRepository } from "../../domain/repositories/outbox-event.repository";
import { BATCH_SIZE } from "../../domain/constants/outbox.constants";
import { ProcessPendingEventsQuery } from "./process-pending-events.query";
import { OutboxEvent } from "../../domain/entities/outbox-event.entity";
import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

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
