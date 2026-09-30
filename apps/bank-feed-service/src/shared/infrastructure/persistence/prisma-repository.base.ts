import { Prisma, PrismaClient } from '../../../prisma-client';
import { AggregateRoot } from '@core/domain/aggregate-root';
import { IEventBus } from '@core/domain/events/domain-event';

export abstract class PrismaRepository<T extends AggregateRoot> {
  constructor(
    protected readonly prisma: PrismaClient,
    protected readonly eventBus: IEventBus
  ) {}

  protected async dispatchEvents(aggregate: T): Promise<void> {
    const events = aggregate.domainEvents;

    if (events.length > 0) {
      await this.eventBus.publishAll(events);
      aggregate.clearDomainEvents();
    }
  }

  protected async persistOutboxEvents(
    tx: Prisma.TransactionClient,
    aggregates: readonly T[]
  ): Promise<void> {
    const events = aggregates.flatMap((aggregate) => aggregate.domainEvents);
    if (events.length === 0) return;
    await tx.outboxEvent.createMany({
      data: events.map((event) => ({
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        eventType: event.eventType,
        payload: event.getPayload() as Prisma.InputJsonValue,
        status: 'PENDING' as const,
      })),
    });
  }

  protected clearPersistedEvents(aggregates: readonly T[]): void {
    aggregates.forEach((aggregate) => aggregate.clearDomainEvents());
  }
}
