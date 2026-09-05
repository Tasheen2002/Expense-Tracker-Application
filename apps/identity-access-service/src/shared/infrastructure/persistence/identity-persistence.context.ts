import { AsyncLocalStorage } from 'node:async_hooks';
import { Prisma, PrismaClient } from '@prisma/client';
import { AggregateRoot } from '@core/domain/aggregate-root';
import { IUnitOfWork, OperationContext } from '../../../modules/identity-workspace/application/ports/unit-of-work';

interface TransactionState {
  client: Prisma.TransactionClient;
  metadata: OperationContext;
  aggregates: Set<AggregateRoot>;
  recordedEvents: Set<string>;
}

export class IdentityPersistenceContext implements IUnitOfWork {
  private readonly storage = new AsyncLocalStorage<TransactionState>();
  constructor(private readonly root: PrismaClient) {}
  get client(): Prisma.TransactionClient { return this.storage.getStore()?.client ?? this.root; }

  async execute<T>(work: () => Promise<T>, metadata: OperationContext = {}): Promise<T> {
    if (this.storage.getStore()) return work();
    // Retry the whole use case, including authorization and invariant checks.
    for (let attempt = 0; ; attempt++) {
      const aggregates = new Set<AggregateRoot>();
      try {
        const result = await this.root.$transaction(
          client => this.storage.run({ client, metadata, aggregates, recordedEvents: new Set() }, work),
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 15000 },
        );
        for (const aggregate of aggregates) aggregate.clearDomainEvents();
        return result;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt < 3) continue;
        throw error;
      }
    }
  }

  async recordEvents(aggregate: AggregateRoot): Promise<void> {
    const state = this.storage.getStore();
    if (!state) throw new Error('Outbox writes require a transaction');
    for (const event of aggregate.domainEvents) {
      if (state.recordedEvents.has(event.eventId)) continue;
      await state.client.outboxEvent.create({ data: {
        id: event.eventId, aggregateId: event.aggregateId, aggregateType: event.aggregateType,
        eventType: event.eventType, createdAt: event.occurredAt, status: 'PENDING',
        payload: { ...event.getPayload(), ...state.metadata, eventVersion: 1 } as Prisma.InputJsonObject,
      } });
      state.recordedEvents.add(event.eventId);
    }
    state.aggregates.add(aggregate);
  }
}
