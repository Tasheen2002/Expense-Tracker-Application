import { DomainEvent } from '@expense-tracker/core';

export class LocalOutboxDomainEvent extends DomainEvent {
  constructor(
    public readonly type: string,
    aggregateId: string,
    aggregateType: string,
    private readonly payload: Record<string, unknown>,
    occurredAt?: Date
  ) {
    super(aggregateId, aggregateType);
    if (occurredAt) {
      (this as any).occurredAt = occurredAt;
    }
  }

  get eventType(): string {
    return this.type;
  }

  getPayload(): Record<string, unknown> {
    return this.payload;
  }
}
