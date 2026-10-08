import { PrismaClient, Prisma } from '@prisma/client';
import { AggregateRoot } from '@core/domain/aggregate-root';
import { DomainEvent } from '@core/domain/events/domain-event';

export async function persistDomainEvents(tx: Prisma.TransactionClient, events: readonly DomainEvent[]): Promise<void> {
  for (const event of events) {
    await tx.outboxEvent.create({ data: {
      id: event.eventId, aggregateType: event.aggregateType, aggregateId: event.aggregateId,
      eventType: event.eventType, payload: event.getPayload() as Prisma.InputJsonObject,
      status: 'PENDING', createdAt: event.occurredAt,
    } });
  }
}

export abstract class PrismaRepository<T extends AggregateRoot> {
  constructor(
    protected readonly prisma: PrismaClient
  ) {}

  protected async persistWithEvents(aggregate: T, write: (tx: Prisma.TransactionClient) => Promise<unknown>): Promise<void> {
    const events = [...aggregate.domainEvents];
    await this.prisma.$transaction(async tx => {
      await write(tx);
      await persistDomainEvents(tx, events);
    });
    aggregate.clearDomainEvents();
  }
}
