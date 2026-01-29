import { DomainEvent } from "./events/domain-event";

export abstract class AggregateRoot {
  private _domainEvents: DomainEvent[] = [];

  public get domainEvents(): DomainEvent[] {
    return this._domainEvents;
  }

  protected addDomainEvent(domainEvent: DomainEvent): void {
    this._domainEvents.push(domainEvent);
  }

  public clearDomainEvents(): void {
    this._domainEvents = [];
  }
}
