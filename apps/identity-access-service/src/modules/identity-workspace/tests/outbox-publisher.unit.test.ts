import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpWebhookPublisher, OutboxWorker, OutboxEventDTO, IOutboxEventRepository } from '@expense-tracker/outbox-kit';

describe('Outbox Per-Subscriber Delivery & Retry Tracking (Unit)', () => {
  const originalFetch = globalThis.fetch;
  let failNotification = false;

  beforeEach(() => {
    vi.clearAllMocks();
    failNotification = false;

    globalThis.fetch = vi.fn(async (input: unknown) => {
      const url = typeof input === 'string' ? input : (input as { url?: string; toString: () => string })?.url || String(input);
      if (url.includes('notification-service') && failNotification) {
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ acknowledged: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('HttpWebhookPublisher', () => {
    it('should deliver to subscribers and invoke onSubscriberSuccess callback for each success', async () => {
      const routes = {
        UserRegistered: ['http://audit-service/webhook', 'http://notification-service/webhook'],
      };
      const publisher = new HttpWebhookPublisher(routes);

      const event: OutboxEventDTO = {
        id: 'evt-100',
        aggregateType: 'User',
        aggregateId: 'usr-1',
        eventType: 'UserRegistered',
        payload: { correlationId: 'corr-1' },
        status: 'PROCESSING',
        createdAt: new Date().toISOString(),
        processedAt: null,
        retryCount: 0,
        error: null,
        deliveredTo: [],
      };

      const deliveredUrls: string[] = [];
      const onSubscriberSuccess = vi.fn(async (url: string) => {
        deliveredUrls.push(url);
      });

      await publisher.publish(event, onSubscriberSuccess);

      expect(onSubscriberSuccess).toHaveBeenCalledTimes(2);
      expect(deliveredUrls).toContain('http://audit-service/webhook');
      expect(deliveredUrls).toContain('http://notification-service/webhook');
    });

    it('should skip subscribers already in deliveredTo and only dispatch to pending ones', async () => {
      const routes = {
        UserRegistered: ['http://audit-service/webhook', 'http://notification-service/webhook'],
      };
      const publisher = new HttpWebhookPublisher(routes);

      // Audit service already received it on a previous attempt
      const event: OutboxEventDTO = {
        id: 'evt-101',
        aggregateType: 'User',
        aggregateId: 'usr-1',
        eventType: 'UserRegistered',
        payload: {},
        status: 'PROCESSING',
        createdAt: new Date().toISOString(),
        processedAt: null,
        retryCount: 1,
        error: null,
        deliveredTo: ['http://audit-service/webhook'],
      };

      const deliveredUrls: string[] = [];
      await publisher.publish(event, async (url) => {
        deliveredUrls.push(url);
      });

      // Only notification service should have been called
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      expect(deliveredUrls).toEqual(['http://notification-service/webhook']);
    });

    it('should throw when a subscriber fails, but still invoke callback for succeeded subscribers', async () => {
      failNotification = true;

      const routes = {
        UserRegistered: ['http://audit-service/webhook', 'http://notification-service/webhook'],
      };
      const publisher = new HttpWebhookPublisher(routes);

      const event: OutboxEventDTO = {
        id: 'evt-102',
        aggregateType: 'User',
        aggregateId: 'usr-1',
        eventType: 'UserRegistered',
        payload: {},
        status: 'PROCESSING',
        createdAt: new Date().toISOString(),
        processedAt: null,
        retryCount: 0,
        error: null,
        deliveredTo: [],
      };

      const deliveredUrls: string[] = [];
      const onSubscriberSuccess = vi.fn(async (url: string) => {
        deliveredUrls.push(url);
      });

      await expect(publisher.publish(event, onSubscriberSuccess)).rejects.toThrow(
        /Delivery failed for 1\/2 subscriber/
      );

      // Audit service succeeded and was recorded!
      expect(deliveredUrls).toContain('http://audit-service/webhook');
      expect(deliveredUrls).not.toContain('http://notification-service/webhook');
    });
  });

  describe('OutboxWorker integration with markDelivered', () => {
    it('should mark delivered for successful subscriber and increment retry when another fails', async () => {
      const mockRepository: IOutboxEventRepository = {
        findPending: vi.fn().mockResolvedValue([]),
        findFailed: vi.fn().mockResolvedValue([]),
        claimPending: vi.fn().mockResolvedValue([
          {
            id: 'evt-200',
            aggregateType: 'User',
            aggregateId: 'usr-2',
            eventType: 'UserRegistered',
            payload: {},
            status: 'PROCESSING',
            createdAt: new Date().toISOString(),
            processedAt: null,
            retryCount: 0,
            error: null,
            deliveredTo: [],
          },
        ]),
        claimFailed: vi.fn().mockResolvedValue([]),
        releaseExpiredLeases: vi.fn().mockResolvedValue(0),
        markDelivered: vi.fn().mockResolvedValue(undefined),
        updateStatus: vi.fn().mockResolvedValue(undefined),
        incrementRetry: vi.fn().mockResolvedValue(undefined),
        deleteProcessedBefore: vi.fn().mockResolvedValue(0),
        save: vi.fn().mockResolvedValue(undefined),
      };

      // Mock publisher that delivers to 1st URL and fails on 2nd URL
      const mockPublisher = {
        publish: vi.fn(async (_event: OutboxEventDTO, onSubscriberSuccess?: (url: string) => Promise<void>) => {
          if (onSubscriberSuccess) {
            await onSubscriberSuccess('http://audit-service/webhook');
          }
          throw new Error('Delivery failed for 1/2 subscriber(s): http://notification-service/webhook');
        }),
      };

      const worker = new OutboxWorker(mockRepository, mockPublisher, {
        pollIntervalMs: 100000,
        maxRetries: 3,
      });

      // Trigger one process loop manually by calling private processEvents
      await (worker as unknown as { processEvents: () => Promise<void> }).processEvents();

      // 1. markDelivered was called for the successful subscriber!
      expect(mockRepository.markDelivered).toHaveBeenCalledWith('evt-200', 'http://audit-service/webhook');

      // 2. updateStatus(PROCESSED) was NOT called because notification service failed
      expect(mockRepository.updateStatus).not.toHaveBeenCalledWith('evt-200', 'PROCESSED');

      // 3. incrementRetry was called to schedule exponential backoff
      expect(mockRepository.incrementRetry).toHaveBeenCalledWith(
        'evt-200',
        expect.stringContaining('Delivery failed for 1/2 subscriber(s)')
      );
    });
  });
});
