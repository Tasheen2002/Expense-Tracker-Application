import type { Prisma, PrismaClient } from '@prisma/client';
import { AggregateRoot } from '@core/domain/aggregate-root';
import { IEventBus } from '@core/domain/events/domain-event';
import { PrismaUnitOfWork } from './prisma-unit-of-work';

export abstract class PrismaRepository<T extends AggregateRoot> {
  constructor(
    protected readonly rootPrisma: PrismaClient,
    protected readonly eventBus: IEventBus
  ) { }

  /**
   * Returns the ambient transaction client if inside a UnitOfWork, or the root PrismaClient.
   */
  protected get prisma(): PrismaClient | Prisma.TransactionClient {
    return PrismaUnitOfWork.getClient(this.rootPrisma);
  }

  /**
   * Executes operations within a transaction. If already inside a UnitOfWork transaction,
   * reuses the active transaction client without attempting a nested transaction.
   */
  protected async runInTransaction<R>(
    fn: (tx: Prisma.TransactionClient) => Promise<R>
  ): Promise<R> {
    const client = this.prisma;
    if (PrismaUnitOfWork.isTransactionClient(client)) {
      return fn(client);
    }
    const uow = new PrismaUnitOfWork(this.rootPrisma);
    return uow.execute(async () => {
      const tx = PrismaUnitOfWork.getClient(this.rootPrisma) as Prisma.TransactionClient;
      return fn(tx);
    });
  }

  protected async dispatchEvents(
    aggregate: T,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const events = [...aggregate.domainEvents];
    if (events.length === 0) return;

    const activeTx = tx || (PrismaUnitOfWork.isTransactionClient(this.prisma) ? this.prisma : null);

    if (activeTx && 'outboxEvent' in activeTx) {
      await (activeTx as any).outboxEvent.createMany({
        data: events.map((event) => ({
          id: event.eventId,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          eventType: event.eventType,
          payload: event.getPayload() as any,
          status: 'PENDING',
          createdAt: event.occurredAt,
        })),
        skipDuplicates: true,
      });
    }

    if (PrismaUnitOfWork.isInTransaction()) {
      // Defer in-memory event publication until the ambient UnitOfWork transaction commits
      aggregate.clearDomainEvents();
      PrismaUnitOfWork.addRollbackHook(() => aggregate.restoreDomainEvents(events));
      PrismaUnitOfWork.addPostCommitHook(async () => {
        await this.eventBus.publishAll(events);
      });
    } else {
      // Standalone execution outside UnitOfWork: persist outbox record if available, then publish immediately
      if (!activeTx && 'outboxEvent' in this.rootPrisma) {
        await (this.rootPrisma as any).outboxEvent.createMany({
          data: events.map((event) => ({
            id: event.eventId,
            aggregateType: event.aggregateType,
            aggregateId: event.aggregateId,
            eventType: event.eventType,
            payload: event.getPayload() as any,
            status: 'PENDING',
            createdAt: event.occurredAt,
          })),
          skipDuplicates: true,
        });
      }
      await this.eventBus.publishAll(events);
      aggregate.clearDomainEvents();
    }
  }
}
