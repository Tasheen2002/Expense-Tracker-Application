import { IOutboxEventRepository } from "../../domain/repositories/outbox-event.repository";
import {
  OutboxEvent,
  OutboxDomainEvent,
} from "../../domain/entities/outbox-event.entity";
import { OutboxEventId } from "../../domain/value-objects/outbox-event-id";
import { OutboxEventNotFoundError } from "../../domain/errors/outbox-event.errors";
import { IEventBus } from "../../../../apps/api/src/shared/domain/events";

export class OutboxEventService {
  constructor(
    private readonly repository: IOutboxEventRepository,
    private readonly eventBus: IEventBus,
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
        event.createdAt,
      );

      // Publish the event to the event bus
      await this.eventBus.publish(domainEvent);

      event.markAsProcessed();
      await this.repository.save(event);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      event.markAsFailed(errorMessage);
      await this.repository.save(event);
      throw error;
    }
  }

  async retryFailedEvent(eventId: OutboxEventId): Promise<void> {
    const event = await this.repository.findById(eventId);
    if (!event) {
      throw new OutboxEventNotFoundError(eventId.getValue());
    }

    if (!event.canRetry()) {
      throw new Error(
        `Event ${eventId.getValue()} has exceeded max retry attempts`,
      );
    }

    event.resetToPending();
    await this.repository.save(event);
  }

  async cleanupProcessedEvents(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    return await this.repository.deleteProcessedEvents(cutoffDate);
  }
}
