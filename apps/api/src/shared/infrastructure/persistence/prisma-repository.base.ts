import { PrismaClient } from "@prisma/client";
import { AggregateRoot } from "../../domain/aggregate-root";
import { IEventBus } from "../../domain/events/domain-event";

export abstract class PrismaRepository<T extends AggregateRoot> {
  constructor(
    protected readonly prisma: PrismaClient,
    protected readonly eventBus: IEventBus,
  ) {}

  protected async dispatchEvents(aggregate: T): Promise<void> {
    const events = aggregate.domainEvents;

    if (events.length > 0) {
      await this.eventBus.publishAll(events);
      aggregate.clearDomainEvents();
    }
  }
}
