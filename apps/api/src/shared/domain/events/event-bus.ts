import { DomainEvent, DomainEventHandler, IEventBus } from "./domain-event";

type HandlerMap = Map<string, Set<DomainEventHandler>>;

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
      console.debug(
        `[EventBus] No handlers for event type: ${event.eventType}`,
      );
      return;
    }

    const handlerPromises = Array.from(handlersForType).map(async (handler) => {
      try {
        await handler.handle(event);
      } catch (error) {
        console.error(
          `[EventBus] Handler failed for ${event.eventType}:`,
          error instanceof Error ? error.message : error,
        );
        // Don't rethrow - other handlers should still execute
      }
    });

    // Execute handlers concurrently
    await Promise.allSettled(handlerPromises);
  }

  /**
   * Gets the count of registered handlers (for testing/debugging).
   */
  getHandlerCount(eventType: string): number {
    return this.handlers.get(eventType)?.size ?? 0;
  }

  /**
   * Clears all handlers (for testing).
   */
  clearHandlers(): void {
    this.handlers.clear();
  }
}

// Singleton instance for application-wide use
let eventBusInstance: InMemoryEventBus | null = null;

export function getEventBus(): IEventBus {
  if (!eventBusInstance) {
    eventBusInstance = new InMemoryEventBus();
  }
  return eventBusInstance;
}

export function resetEventBus(): void {
  eventBusInstance = null;
}
