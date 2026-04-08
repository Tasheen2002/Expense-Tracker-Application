import { IOutboxEventRepository } from '../../domain/repositories/outbox-event.repository';
import {
  OutboxEvent,
  OutboxEventDTO,
  OutboxDomainEvent,
} from '../../domain/entities/outbox-event.entity';
import { OutboxEventId } from '../../domain/value-objects/outbox-event-id';
import {
  OutboxEventNotFoundError,
  OutboxEventProcessingError,
} from '../../domain/errors/outbox-event.errors';
import { OutboxEventStatus } from '../../domain/enums/outbox-event-status.enum';
import { IEventBus } from '../../../../packages/core/src/domain/events/domain-event';
import { MAX_RETRY_COUNT, BATCH_SIZE } from '../../domain/constants/outbox.constants';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';

export class OutboxEventService {
  constructor(
    private readonly repository: IOutboxEventRepository,
    private readonly eventBus: IEventBus
  ) {}

  async processEvent(event: OutboxEvent): Promise<void> {
    event.markAsProcessing();
    await this.repository.save(event);

    try {
      // Reconstruct domain event from outbox event
      const domainEvent = new OutboxDomainEvent(
        event.aggregateId.getValue(),
        event.aggregateType,
        event.eventType,
        event.payload,
        event.createdAt
      );

      // Publish the event to the event bus
      await this.eventBus.publish(domainEvent);

      event.markAsProcessed();
      await this.repository.save(event);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      // Truncate error message to prevent oversized storage
      const truncatedError = errorMessage.substring(0, 1000);
      event.markAsFailed(truncatedError);
      await this.repository.save(event);

      throw error;
    }
  }

  async retryFailedEvent(eventId: OutboxEventId): Promise<void> {
    const event = await this.repository.findById(eventId);
    if (!event) {
      throw new OutboxEventNotFoundError(eventId.getValue());
    }

    if (!event.canRetry(MAX_RETRY_COUNT)) {
      throw new OutboxEventProcessingError(
        eventId.getValue(),
        `Exceeded max retry attempts (${MAX_RETRY_COUNT})`
      );
    }

    event.resetToPending();
    await this.repository.save(event);
  }

  /**
   * Automatically retry all failed events that haven't exhausted their retry count.
   * Returns the number of events queued for retry.
   */
  async retryAllFailedEvents(): Promise<{
    retried: number;
    deadLettered: number;
  }> {
    const failedEvents =
      await this.repository.findFailedEventsForRetry(MAX_RETRY_COUNT);

    let retried = 0;
    let deadLettered = 0;

    const eventsToRetry: OutboxEvent[] = [];
    for (const event of failedEvents.items) {
      if (event.canRetry(MAX_RETRY_COUNT)) {
        event.resetToPending();
        eventsToRetry.push(event);
        retried++;
      } else {
        deadLettered++;
      }
    }

    if (eventsToRetry.length > 0) {
      await this.repository.saveAll(eventsToRetry);
    }

    return { retried, deadLettered };
  }

  /**
   * Get count of failed events (includes dead-lettered events that exceeded max retries).
   * Uses efficient DB count instead of loading all events into memory.
   */
  async getDeadLetterCount(): Promise<number> {
    return this.repository.countByStatus(OutboxEventStatus.FAILED);
  }

  async cleanupProcessedEvents(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    return await this.repository.deleteProcessedEvents(cutoffDate);
  }

  async storeEvent(params: {
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    payload: Record<string, unknown>;
  }): Promise<OutboxEventDTO> {
    const event = OutboxEvent.create(params);
    await this.repository.save(event);
    return OutboxEvent.toDTO(event);
  }

  async processEventById(eventId: string): Promise<void> {
    const event = await this.repository.findById(
      OutboxEventId.fromString(eventId)
    );
    if (!event) {
      throw new OutboxEventNotFoundError(eventId);
    }
    await this.processEvent(event);
  }

  async getPendingEvents(
    limit?: number,
    offset?: number
  ): Promise<PaginatedResult<OutboxEventDTO>> {
    const result = await this.repository.findPendingEvents({
      limit: limit ?? BATCH_SIZE,
      offset: offset ?? 0,
    });
    return { ...result, items: result.items.map((e) => OutboxEvent.toDTO(e)) };
  }

  async getFailedEvents(
    maxRetries?: number,
    limit?: number,
    offset?: number
  ): Promise<PaginatedResult<OutboxEventDTO>> {
    const result = await this.repository.findFailedEventsForRetry(
      maxRetries ?? MAX_RETRY_COUNT,
      { limit: limit ?? BATCH_SIZE, offset: offset ?? 0 }
    );
    return { ...result, items: result.items.map((e) => OutboxEvent.toDTO(e)) };
  }
}
