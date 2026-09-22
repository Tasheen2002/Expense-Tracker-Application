import { IOutboxEventRepository, OutboxEventDTO } from './outbox-event.entity';
import { IEventPublisher } from './outbox-publisher';

export interface OutboxWorkerConfig {
  pollIntervalMs?: number;
  maxRetries?: number;
  cleanupRetentionDays?: number;
  batchSize?: number;
}

export class OutboxWorker {
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;
  private readonly pollIntervalMs: number;
  private readonly maxRetries: number;
  private readonly cleanupRetentionDays: number;
  private readonly batchSize: number;

  constructor(
    private readonly repository: IOutboxEventRepository,
    private readonly publisher: IEventPublisher,
    config?: OutboxWorkerConfig
  ) {
    this.pollIntervalMs = config?.pollIntervalMs || 5000;
    this.maxRetries = config?.maxRetries || 5;
    this.cleanupRetentionDays = config?.cleanupRetentionDays || 7;
    this.batchSize = config?.batchSize || 50;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[Outbox-Worker] Started outbox polling (interval: ${this.pollIntervalMs}ms)`);
    this.runLoop();
  }

  stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    console.log('[Outbox-Worker] Stopped outbox polling');
  }

  private async runLoop(): Promise<void> {
    if (!this.isRunning) return;

    try {
      await this.processEvents();
    } catch (error: any) {
      console.error('[Outbox-Worker] Critical error during polling loop:', error.message || error);
    }

    if (this.isRunning) {
      this.timer = setTimeout(() => this.runLoop(), this.pollIntervalMs);
    }
  }

  private async processEvents(): Promise<void> {
    // 1. Process pending events
    const pending = await this.repository.findPending(this.batchSize);
    if (pending.length > 0) {
      console.log(`[Outbox-Worker] Found ${pending.length} pending events to dispatch`);
    }
    for (const event of pending) {
      await this.processSingleEvent(event);
    }

    // 2. Retry failed events
    const failed = await this.repository.findFailed(this.batchSize, this.maxRetries);
    if (failed.length > 0) {
      console.log(`[Outbox-Worker] Found ${failed.length} failed events to retry`);
    }
    for (const event of failed) {
      await this.processSingleEvent(event);
    }
  }

  private async processSingleEvent(event: OutboxEventDTO): Promise<void> {
    try {
      await this.repository.updateStatus(event.id, 'PROCESSING');
      await this.publisher.publish(event);
      await this.repository.updateStatus(event.id, 'PROCESSED');
    } catch (error: any) {
      const errMsg = error.message || String(error);
      console.error(`[Outbox-Worker] Failed event dispatch ${event.eventType} (ID: ${event.id}): ${errMsg}`);
      await this.repository.incrementRetry(event.id, errMsg);
    }
  }

  async runCleanup(): Promise<number> {
    console.log(`[Outbox-Worker] Cleaning up processed events older than ${this.cleanupRetentionDays} days`);
    return this.repository.deleteProcessedBefore(this.cleanupRetentionDays);
  }
}
