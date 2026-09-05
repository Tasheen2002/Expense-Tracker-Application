import { AggregateRoot } from '@core/domain/aggregate-root';
import { IdentityPersistenceContext } from './identity-persistence.context';

export abstract class PrismaRepository<T extends AggregateRoot> {
  constructor(protected readonly context: IdentityPersistenceContext) {}
  protected get prisma() { return this.context.client; }
  protected persistEvents(aggregate: T): Promise<void> { return this.context.recordEvents(aggregate); }
}
