import { DomainEvent } from '../../../../packages/core/src/domain/events/domain-event';

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
    private readonly _occurredAt?: Date
  ) {
    super(aggregateId, aggregateType);
    if (_occurredAt) {
      // Override occurredAt with the original timestamp
      (this as any).occurredAt = _occurredAt;
    }
  }

  get eventType(): string {
    return this._eventType;
  }

  protected getPayload(): Record<string, unknown> {
    return this.payload;
  }
}
