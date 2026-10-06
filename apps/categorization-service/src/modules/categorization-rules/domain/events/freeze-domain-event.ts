import { DomainEvent } from '@core/domain/events/domain-event';

/** Finalize after the concrete event has initialized all of its payload fields. */
export function freezeDomainEvent(event: DomainEvent): void {
  const occurredAt = event.occurredAt.getTime();
  Object.defineProperty(event, 'occurredAt', {
    get: () => new Date(occurredAt),
    enumerable: true,
    configurable: false,
  });
  Object.freeze(event);
}
