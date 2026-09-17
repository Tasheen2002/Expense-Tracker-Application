import { PrismaClient } from './prisma.client';
import type { Prisma } from '@prisma/client';
import { AggregateRoot } from '@core/domain/aggregate-root';
import { IEventBus } from '@core/domain/events/domain-event';

export abstract class PrismaRepository<T extends AggregateRoot> {
  constructor(
    protected readonly prisma: PrismaClient,
    protected readonly eventBus: IEventBus
  ) {}

  /**
   * Persists domain events into the transactional outbox table
   * within the same database transaction client.
   */
  protected async persistOutboxEvents(
    tx: Prisma.TransactionClient,
    aggregate: T
  ): Promise<void> {
    const events = aggregate.domainEvents;
    for (const event of events) {
      await tx.outboxEvent.create({
        data: {
          id: event.eventId,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          eventType: event.eventType,
          payload: event.getPayload() as Prisma.InputJsonObject,
          status: 'PENDING',
          createdAt: event.occurredAt,
        },
      });
    }
  }

  /**
   * Dispatches events to the local in-memory event bus for in-process subscribers
   * after transaction commit and clears events on the aggregate.
   *
   * Local dispatch is treated as best-effort: failures in in-memory subscribers
   * are logged and do not report an already-committed database transaction as failed.
   */
  protected async dispatchEvents(aggregate: T): Promise<void> {
    const events = aggregate.domainEvents;

    if (events.length > 0) {
      aggregate.clearDomainEvents();
      try {
        await this.eventBus.publishAll(events);
      } catch (err) {
        const aggregateId = events[0]?.aggregateId ?? 'unknown';
        console.warn(
          `[PrismaRepository] Best-effort in-memory dispatch failed for aggregate ${aggregateId}:`,
          err
        );
      }
    }
  }
}
