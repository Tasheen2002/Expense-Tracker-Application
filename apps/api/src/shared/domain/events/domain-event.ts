import { randomUUID } from "crypto";

/**
 * Base class for all domain events.
 * Follows the Domain-Driven Design pattern for event-driven architecture.
 */
export abstract class DomainEvent {
  public readonly eventId: string;
  public readonly occurredAt: Date;
  public readonly aggregateId: string;
  public readonly aggregateType: string;

  constructor(aggregateId: string, aggregateType: string) {
    this.eventId = randomUUID();
    this.occurredAt = new Date();
    this.aggregateId = aggregateId;
    this.aggregateType = aggregateType;
  }

  abstract get eventType(): string;

  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      payload: this.getPayload(),
    };
  }

  abstract getPayload(): Record<string, unknown>;
}

/**
 * Interface for domain event handlers.
 */
export interface DomainEventHandler<T extends DomainEvent = DomainEvent> {
  readonly eventType: string;
  handle(event: T): Promise<void>;
}

/**
 * Interface for the event bus that dispatches domain events.
 */
export interface IEventBus {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: DomainEvent[]): Promise<void>;
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: DomainEventHandler<T>,
  ): void;
  unsubscribe(eventType: string, handler: DomainEventHandler): void;
}

/**
 * Interface for entities that can emit domain events.
 */
export interface EventEmittingAggregate {
  readonly domainEvents: DomainEvent[];
  clearEvents(): void;
}
