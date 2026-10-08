import { PrismaClient, Prisma } from '@prisma/client';
import { AggregateRoot } from '@core/domain/aggregate-root';

export abstract class PrismaRepository<T extends AggregateRoot> {
  constructor(protected readonly prisma: PrismaClient) {}
  protected async persistWithEvents(aggregate: T, write: (tx: Prisma.TransactionClient) => Promise<unknown>, context: Record<string, unknown> = {}): Promise<void> {
    const events = [...aggregate.domainEvents];
    await this.prisma.$transaction(async tx => {
      await write(tx);
      for (const event of events) {
        await tx.outboxEvent.create({ data: {
          id: event.eventId, aggregateId: event.aggregateId, aggregateType: event.aggregateType,
          eventType: event.eventType, createdAt: event.occurredAt,
          payload: { ...event.getPayload(), ...context } as Prisma.InputJsonObject, status: 'PENDING',
        } });
      }
    });
    aggregate.clearDomainEvents();
  }
}
