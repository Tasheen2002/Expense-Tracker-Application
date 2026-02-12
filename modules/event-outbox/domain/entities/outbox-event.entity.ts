import { OutboxEventId } from "../value-objects/outbox-event-id";
import { AggregateId } from "../value-objects/aggregate-id";
import { OutboxEventStatus } from "../enums/outbox-event-status.enum";
import { DomainEvent } from "../../../../apps/api/src/shared/domain/events";
import { InvalidOutboxEventError } from "../errors/outbox-event.errors";

// ============================================================================
// DOMAIN EVENTS
// ============================================================================

/**
 * Generic domain event for outbox pattern.
 * Used to reconstruct events from the outbox table.
 */
export class OutboxDomainEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    aggregateType: string,
    private readonly _eventType: string,
    private readonly payload: Record<string, unknown>,
    private readonly _occurredAt?: Date,
  ) {
    super(aggregateId, aggregateType);
    if (_occurredAt) {
      // Override occurredAt with the original timestamp
      Object.assign(this, { occurredAt: _occurredAt });
    }
  }

  get eventType(): string {
    return this._eventType;
  }

  getPayload(): Record<string, unknown> {
    return this.payload;
  }
}

// ============================================================================
// ENTITY
// ============================================================================

export interface OutboxEventProps {
  id: OutboxEventId;
  aggregateType: string;
  aggregateId: AggregateId;
  eventType: string;
  payload: Record<string, unknown>;
  status: OutboxEventStatus;
  createdAt: Date;
  processedAt?: Date;
  retryCount: number;
  error?: string;
}

export class OutboxEvent {
  private constructor(private readonly props: OutboxEventProps) {}

  static create(params: {
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    payload: Record<string, unknown>;
  }): OutboxEvent {
    return new OutboxEvent({
      id: OutboxEventId.create(),
      aggregateType: params.aggregateType,
      aggregateId: AggregateId.fromString(params.aggregateId),
      eventType: params.eventType,
      payload: params.payload,
      status: OutboxEventStatus.PENDING,
      createdAt: new Date(),
      retryCount: 0,
    });
  }

  static reconstitute(props: OutboxEventProps): OutboxEvent {
    return new OutboxEvent(props);
  }

  // Getters
  get id(): OutboxEventId {
    return this.props.id;
  }

  get aggregateType(): string {
    return this.props.aggregateType;
  }

  get aggregateId(): AggregateId {
    return this.props.aggregateId;
  }

  get eventType(): string {
    return this.props.eventType;
  }

  get payload(): Record<string, unknown> {
    return this.props.payload;
  }

  get status(): OutboxEventStatus {
    return this.props.status;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get processedAt(): Date | undefined {
    return this.props.processedAt;
  }

  get retryCount(): number {
    return this.props.retryCount;
  }

  get error(): string | undefined {
    return this.props.error;
  }

  // State transitions
  markAsProcessing(): void {
    if (this.props.status === OutboxEventStatus.PROCESSED) {
      throw new InvalidOutboxEventError(
        "Cannot mark processed event as processing",
      );
    }
    this.props.status = OutboxEventStatus.PROCESSING;
  }

  markAsProcessed(): void {
    this.props.status = OutboxEventStatus.PROCESSED;
    this.props.processedAt = new Date();
    this.props.error = undefined;
  }

  markAsFailed(error: string): void {
    this.props.status = OutboxEventStatus.FAILED;
    this.props.error = error;
    this.props.retryCount += 1;
  }

  resetToPending(): void {
    if (this.props.status === OutboxEventStatus.PROCESSED) {
      throw new InvalidOutboxEventError(
        "Cannot reset processed event to pending",
      );
    }
    this.props.status = OutboxEventStatus.PENDING;
  }

  canRetry(maxRetries: number = 3): boolean {
    return (
      this.props.retryCount < maxRetries &&
      this.props.status === OutboxEventStatus.FAILED
    );
  }

  toJSON() {
    return {
      id: this.props.id.getValue(),
      aggregateType: this.props.aggregateType,
      aggregateId: this.props.aggregateId.getValue(),
      eventType: this.props.eventType,
      payload: this.props.payload,
      status: this.props.status,
      createdAt: this.props.createdAt,
      processedAt: this.props.processedAt,
      retryCount: this.props.retryCount,
      error: this.props.error,
    };
  }
}
