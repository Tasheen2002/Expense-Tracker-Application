import { IOutboxEventRepository, OutboxEventDTO } from './outbox-event.entity';
import { IEventPublisher, WebhookDeliveryError } from './outbox-publisher';

export interface OutboxWorkerConfig {
  pollIntervalMs?: number;
  maxRetries?: number;
  cleanupRetentionDays?: number;
  batchSize?: number;
  leaseDurationMs?: number;
}

export class OutboxWorker {
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;
  private activeProcessingPromise: Promise<void> | null = null;
  private readonly pollIntervalMs: number;
  private readonly maxRetries: number;
  private readonly cleanupRetentionDays: number;
  private readonly batchSize: number;
  private readonly leaseDurationMs: number;

  constructor(
    private readonly repository: IOutboxEventRepository,
    private readonly publisher: IEventPublisher,
    config?: OutboxWorkerConfig
  ) {
    this.pollIntervalMs = config?.pollIntervalMs || 5000;
    this.maxRetries = config?.maxRetries || 5;
    this.cleanupRetentionDays = config?.cleanupRetentionDays || 7;
    this.batchSize = config?.batchSize || 10;
    this.leaseDurationMs = config?.leaseDurationMs || 60_000;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[Outbox-Worker] Started outbox polling (interval: ${this.pollIntervalMs}ms)`);
    this.runLoop();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.activeProcessingPromise) {
      console.log('[Outbox-Worker] Awaiting active processing batch before shutdown...');
      await this.activeProcessingPromise;
    }
    console.log('[Outbox-Worker] Stopped outbox polling');
  }

  private async runLoop(): Promise<void> {
    if (!this.isRunning) return;

    try {
      this.activeProcessingPromise = this.processEvents();
      await this.activeProcessingPromise;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Outbox-Worker] Unexpected error during loop: ${errMsg}`);
    } finally {
      this.activeProcessingPromise = null;
      if (this.isRunning) {
        this.timer = setTimeout(() => this.runLoop(), this.pollIntervalMs);
      }
    }
  }

  private async processEvents(): Promise<void> {
    // 0. Recover any expired leases from crashed workers
    if (this.repository.releaseExpiredLeases) {
      const recovered = await this.repository.releaseExpiredLeases();
      if (recovered > 0) {
        console.log(`[Outbox-Worker] Recovered ${recovered} expired outbox lease(s)`);
      }
    }

    // 1. Process pending events (using atomic claim if supported)
    const pending = this.repository.claimPending
      ? await this.repository.claimPending(this.batchSize, this.leaseDurationMs)
      : await this.repository.findPending(this.batchSize);

    if (pending.length > 0) {
      console.log(`[Outbox-Worker] Claimed ${pending.length} pending events to dispatch`);
    }
    for (const event of pending) {
      await this.processSingleEvent(event);
    }

    // 2. Retry failed events (using atomic claim if supported)
    const failed = this.repository.claimFailed
      ? await this.repository.claimFailed(this.batchSize, this.maxRetries, this.leaseDurationMs)
      : await this.repository.findFailed(this.batchSize, this.maxRetries);

    if (failed.length > 0) {
      console.log(`[Outbox-Worker] Claimed ${failed.length} failed events to retry`);
    }
    for (const event of failed) {
      await this.processSingleEvent(event);
    }
  }

  private async processSingleEvent(event: OutboxEventDTO): Promise<void> {
    try {
      if (event.status !== 'PROCESSING') {
        const acquired = await this.repository.updateStatus(event.id, 'PROCESSING', undefined, event.leaseToken);
        if (acquired === false) {
          console.warn(`[Outbox-Worker] Lost lease ownership before processing event ${event.id}. Aborting.`);
          return;
        }
      }

      // Renew lease right before delivery to ensure later items in a batch don't expire prematurely
      if (this.repository.renewLease && event.leaseToken) {
        const renewed = await this.repository.renewLease(event.id, event.leaseToken, this.leaseDurationMs);
        if (!renewed) {
          console.warn(`[Outbox-Worker] Lost lease ownership before dispatching event ${event.id} (lease expired or reclaimed). Aborting.`);
          return;
        }
      }

      // Deliver only to subscribers who haven't received it yet; record each successful delivery
      await this.publisher.publish(event, async (subscriberUrl: string) => {
        if (this.repository.markDelivered) {
          const marked = event.leaseToken !== undefined
            ? await this.repository.markDelivered(event.id, subscriberUrl, event.leaseToken)
            : await this.repository.markDelivered(event.id, subscriberUrl);
          if (marked === false) {
            throw new Error(`[Outbox-Worker] Lost lease ownership while marking delivery for event ${event.id}.`);
          }
        }
      });

      // All subscribers delivered successfully
      const processed = event.leaseToken !== undefined
        ? await this.repository.updateStatus(event.id, 'PROCESSED', undefined, event.leaseToken)
        : await this.repository.updateStatus(event.id, 'PROCESSED', undefined);
      if (processed === false) {
        console.warn(`[Outbox-Worker] Lost lease ownership when completing event ${event.id}. Reclaimed by another worker.`);
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (error instanceof WebhookDeliveryError && !error.retryable) {
        const quarantined = await this.repository.updateStatus(event.id, 'DEAD_LETTER', errMsg, event.leaseToken);
        console.warn(JSON.stringify({
          level: 40, component: 'Outbox-Worker', eventId: event.id, eventType: event.eventType,
          httpStatuses: error.httpStatuses,
          status: quarantined === false ? 'LEASE_LOST' : 'DEAD_LETTER',
          message: quarantined === false
            ? 'Lease ownership lost; quarantine was not recorded'
            : 'Event permanently rejected; moved to dead letters; automatic retries stopped',
        }));
        return;
      }

      console.error(`[Outbox-Worker] Failed event dispatch ${event.eventType} (ID: ${event.id}): ${errMsg}`);

      const currentRetries = event.retryCount + 1;
      if (currentRetries >= this.maxRetries) {
        console.error(
          `[Outbox-Worker] ⚠️ DEAD LETTER: Event ${event.eventType} (ID: ${event.id}) exhausted ` +
          `all ${this.maxRetries} retries. Moving to DEAD_LETTER for manual investigation.`
        );
        if (event.leaseToken !== undefined) {
          await this.repository.updateStatus(event.id, 'DEAD_LETTER', errMsg, event.leaseToken);
        } else {
          await this.repository.updateStatus(event.id, 'DEAD_LETTER', errMsg);
        }
      } else {
        if (event.leaseToken !== undefined) {
          await this.repository.incrementRetry(event.id, errMsg, event.leaseToken);
        } else {
          await this.repository.incrementRetry(event.id, errMsg);
        }
      }
    }
  }

  async runCleanup(): Promise<number> {
    console.log(`[Outbox-Worker] Cleaning up processed events older than ${this.cleanupRetentionDays} days`);
    return this.repository.deleteProcessedBefore(this.cleanupRetentionDays);
  }
}
