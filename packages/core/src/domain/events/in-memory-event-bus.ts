import { DomainEvent, DomainEventHandler, IEventBus } from './domain-event';

type HandlerMap = Map<string, Set<DomainEventHandler>>;

/**
 * In-process event bus with serialised dispatch and per-handler error
 * isolation.
 *
 * - Events are queued and processed FIFO; while one batch is in flight,
 *   subsequent `publish()` calls enqueue and return without re-entering
 *   `processQueue()`. This keeps causal ordering of handler side effects
 *   predictable inside a single request.
 * - Handlers for the same event run concurrently via `Promise.allSettled`
 *   so one slow/failing handler cannot starve others.
 * - A thrown handler logs and continues — never rethrows. The aggregate
 *   that produced the event has already persisted; failing the bus would
 *   surface infrastructure noise as domain errors.
 *
 * Canonical location per the project's pattern reference. The previous
 * implementation lived at `apps/api/src/shared/domain/events/event-bus.ts`
 * — keep the new path as the single source of truth.
 */
export class InMemoryEventBus implements IEventBus {
  private handlers: HandlerMap = new Map();
  private isProcessing = false;
  private eventQueue: DomainEvent[] = [];

  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: DomainEventHandler<T>,
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as DomainEventHandler);
  }

  unsubscribe(eventType: string, handler: DomainEventHandler): void {
    const handlersForType = this.handlers.get(eventType);
    if (handlersForType) {
      handlersForType.delete(handler);
    }
  }

  async publish(event: DomainEvent): Promise<void> {
    this.eventQueue.push(event);
    await this.processQueue();
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    this.eventQueue.push(...events);
    await this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    try {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift();
        if (event) {
          await this.dispatchEvent(event);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async dispatchEvent(event: DomainEvent): Promise<void> {
    const handlersForType = this.handlers.get(event.eventType);
    if (!handlersForType || handlersForType.size === 0) {
      return;
    }

    const handlerPromises = Array.from(handlersForType).map(async (handler) => {
      try {
        await handler.handle(event);
      } catch (error: unknown) {
        // Swallow per-handler failures so siblings still execute. The
        // aggregate has already persisted; surfacing the error here would
        // turn an infra hiccup into a domain failure.
        console.error(
          `[EventBus] Handler failed for ${event.eventType}:`,
          error instanceof Error ? error.message : error,
        );
      }
    });

    await Promise.allSettled(handlerPromises);
  }

  /** Test-only: count handlers registered for an event type. */
  getHandlerCount(eventType: string): number {
    return this.handlers.get(eventType)?.size ?? 0;
  }

  /** Test-only: drop every handler. */
  clearHandlers(): void {
    this.handlers.clear();
  }
}

let eventBusInstance: InMemoryEventBus | null = null;

/** App-wide singleton accessor. Container should use `new InMemoryEventBus()` directly when DI-wired. */
export function getEventBus(): IEventBus {
  if (!eventBusInstance) {
    eventBusInstance = new InMemoryEventBus();
  }
  return eventBusInstance;
}

export function resetEventBus(): void {
  eventBusInstance = null;
}
