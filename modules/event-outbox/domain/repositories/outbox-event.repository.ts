import { OutboxEvent } from "../entities/outbox-event.entity";
import { OutboxEventId } from "../value-objects/outbox-event-id";
import { OutboxEventStatus } from "../enums/outbox-event-status.enum";
import {
  PaginatedResult,
  PaginationOptions,
} from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export interface IOutboxEventRepository {
  save(event: OutboxEvent): Promise<void>;
  saveAll(events: OutboxEvent[]): Promise<void>;
  findById(id: OutboxEventId): Promise<OutboxEvent | null>;
  findPendingEvents(
    options?: PaginationOptions,
  ): Promise<PaginatedResult<OutboxEvent>>;
  findFailedEventsForRetry(
    maxRetries: number,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<OutboxEvent>>;
  findByStatus(
    status: OutboxEventStatus,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<OutboxEvent>>;
  findByAggregateId(aggregateId: string): Promise<OutboxEvent[]>;
  deleteProcessedEvents(olderThan: Date): Promise<number>;
  countByStatus(status: OutboxEventStatus): Promise<number>;
}
