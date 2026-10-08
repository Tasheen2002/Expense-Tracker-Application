import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OutboxWorker } from '../src/outbox-worker';
import { IOutboxEventRepository, OutboxEventDTO } from '../src/outbox-event.entity';
import { IEventPublisher, WebhookDeliveryError } from '../src/outbox-publisher';

describe('OutboxWorker (Unit Tests)', () => {
  let mockRepo: {
    findPending: ReturnType<typeof vi.fn>;
    findFailed: ReturnType<typeof vi.fn>;
    claimPending: ReturnType<typeof vi.fn>;
    claimFailed: ReturnType<typeof vi.fn>;
    releaseExpiredLeases: ReturnType<typeof vi.fn>;
    markDelivered: ReturnType<typeof vi.fn>;
    updateStatus: ReturnType<typeof vi.fn>;
    incrementRetry: ReturnType<typeof vi.fn>;
    renewLease: ReturnType<typeof vi.fn>;
    deleteProcessedBefore: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  interface MockPublisher extends IEventPublisher {
    publish: ReturnType<typeof vi.fn<[OutboxEventDTO, ((url: string) => Promise<void>)?], Promise<void>>>;
  }
  let mockPublisher: MockPublisher;

  const sampleEvent: OutboxEventDTO = {
    id: 'event-1',
    aggregateType: 'Order',
    aggregateId: 'order-1',
    eventType: 'order.created',
    payload: { amount: 100 },
    status: 'PROCESSING',
    retryCount: 0,
    deliveredTo: [],
    createdAt: new Date().toISOString(),
    nextAttemptAt: new Date().toISOString(),
    processedAt: null,
    error: null,
    leaseToken: 'token-abc',
    leaseExpiresAt: new Date(Date.now() + 60_000).toISOString(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    mockRepo = {
      findPending: vi.fn().mockResolvedValue([]),
      findFailed: vi.fn().mockResolvedValue([]),
      claimPending: vi.fn().mockResolvedValue([]),
      claimFailed: vi.fn().mockResolvedValue([]),
      releaseExpiredLeases: vi.fn().mockResolvedValue(0),
      markDelivered: vi.fn().mockResolvedValue(true),
      updateStatus: vi.fn().mockResolvedValue(true),
      incrementRetry: vi.fn().mockResolvedValue(true),
      renewLease: vi.fn().mockResolvedValue(true),
      deleteProcessedBefore: vi.fn().mockResolvedValue(0),
      save: vi.fn().mockResolvedValue(undefined),
    };
    mockPublisher = {
      publish: vi.fn<[OutboxEventDTO, ((url: string) => Promise<void>)?], Promise<void>>().mockImplementation(async (_event, onDelivered) => {
        if (onDelivered) {
          await onDelivered('http://subscriber-1/webhook');
        }
      }),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('claims pending events and delivers them successfully', async () => {
    mockRepo.claimPending.mockResolvedValueOnce([sampleEvent]);

    const worker = new OutboxWorker(mockRepo as unknown as IOutboxEventRepository, mockPublisher, {
      pollIntervalMs: 1000,
      batchSize: 5,
    });

    worker.start();
    await vi.advanceTimersByTimeAsync(0);

    expect(mockRepo.claimPending).toHaveBeenCalledWith(5, 60_000);
    expect(mockRepo.renewLease).toHaveBeenCalledWith('event-1', 'token-abc', 60_000);
    expect(mockPublisher.publish).toHaveBeenCalledWith(sampleEvent, expect.any(Function));
    expect(mockRepo.markDelivered).toHaveBeenCalledWith('event-1', 'http://subscriber-1/webhook', 'token-abc');
    expect(mockRepo.updateStatus).toHaveBeenCalledWith('event-1', 'PROCESSED', undefined, 'token-abc');

    await worker.stop();
  });

  it('aborts dispatch when renewLease returns false (ownership lost before delivery)', async () => {
    mockRepo.claimPending.mockResolvedValueOnce([sampleEvent]);
    mockRepo.renewLease.mockResolvedValueOnce(false); // Lost lease!

    const worker = new OutboxWorker(mockRepo as unknown as IOutboxEventRepository, mockPublisher);

    worker.start();
    await vi.advanceTimersByTimeAsync(0);

    expect(mockRepo.renewLease).toHaveBeenCalledWith('event-1', 'token-abc', 60_000);
    expect(mockPublisher.publish).not.toHaveBeenCalled();
    expect(mockRepo.updateStatus).not.toHaveBeenCalledWith('event-1', 'PROCESSED', undefined, expect.anything());

    await worker.stop();
  });

  it('handles delivery error and increments retryCount with backoff', async () => {
    mockRepo.claimPending.mockResolvedValueOnce([sampleEvent]);
    mockPublisher.publish.mockRejectedValueOnce(new Error('Connection refused'));

    const worker = new OutboxWorker(mockRepo as unknown as IOutboxEventRepository, mockPublisher, {
      maxRetries: 3,
    });

    worker.start();
    await vi.advanceTimersByTimeAsync(0);

    expect(mockRepo.incrementRetry).toHaveBeenCalledWith('event-1', 'Connection refused', 'token-abc');
    expect(mockRepo.updateStatus).not.toHaveBeenCalledWith('event-1', 'PROCESSED', undefined, expect.anything());

    await worker.stop();
  });

  it('quarantines permanent consumer rejections immediately without incrementing retries', async () => {
    const warningLog = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRepo.claimPending.mockResolvedValueOnce([sampleEvent]);
    mockPublisher.publish.mockRejectedValueOnce(new WebhookDeliveryError('HTTP 400 invalid recipient', false, [400]));
    const worker = new OutboxWorker(mockRepo as unknown as IOutboxEventRepository, mockPublisher);
    worker.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(mockRepo.updateStatus).toHaveBeenCalledWith('event-1', 'DEAD_LETTER', 'HTTP 400 invalid recipient', 'token-abc');
    expect(mockRepo.incrementRetry).not.toHaveBeenCalled();
    expect(errorLog).not.toHaveBeenCalled();
    expect(warningLog).toHaveBeenCalledOnce();
    expect(JSON.parse(warningLog.mock.calls[0][0])).toMatchObject({
      eventId: 'event-1', eventType: 'order.created', httpStatuses: [400], status: 'DEAD_LETTER',
    });
    await worker.stop();
  });

  it('does not complete an event when the delivery marker loses its lease', async () => {
    mockRepo.claimPending.mockResolvedValueOnce([sampleEvent]);
    mockRepo.markDelivered.mockResolvedValueOnce(false);
    const worker = new OutboxWorker(mockRepo as unknown as IOutboxEventRepository, mockPublisher);

    worker.start();
    await vi.advanceTimersByTimeAsync(0);

    expect(mockRepo.updateStatus).not.toHaveBeenCalledWith('event-1', 'PROCESSED', undefined, 'token-abc');
    expect(mockRepo.incrementRetry).toHaveBeenCalledWith(
      'event-1',
      expect.stringContaining('Lost lease ownership'),
      'token-abc'
    );
    await worker.stop();
  });

  it('transitions event to DEAD_LETTER when retryCount reaches maxRetries', async () => {
    const exhaustedEvent: OutboxEventDTO = {
      ...sampleEvent,
      retryCount: 2, // 2 retries already, next one hits maxRetries = 3
    };
    mockRepo.claimPending.mockResolvedValueOnce([exhaustedEvent]);
    mockPublisher.publish.mockRejectedValueOnce(new Error('Permanent failure'));

    const worker = new OutboxWorker(mockRepo as unknown as IOutboxEventRepository, mockPublisher, {
      maxRetries: 3,
    });

    worker.start();
    await vi.advanceTimersByTimeAsync(0);

    expect(mockRepo.updateStatus).toHaveBeenCalledWith('event-1', 'DEAD_LETTER', 'Permanent failure', 'token-abc');

    await worker.stop();
  });

  it('gracefully drains in-flight processing batch during stop()', async () => {
    let resolveProcessing: () => void = () => {};
    const slowProcessingPromise = new Promise<void>((resolve) => {
      resolveProcessing = resolve;
    });

    mockRepo.claimPending.mockImplementationOnce(async () => {
      await slowProcessingPromise;
      return [];
    });

    const worker = new OutboxWorker(mockRepo as unknown as IOutboxEventRepository, mockPublisher);
    worker.start();

    // Trigger loop execution
    vi.advanceTimersByTime(0);

    let stopped = false;
    const stopPromise = worker.stop().then(() => {
      stopped = true;
    });

    // Worker should still be waiting on slow processing batch
    expect(stopped).toBe(false);

    // Resolve in-flight processing
    resolveProcessing();
    await stopPromise;

    expect(stopped).toBe(true);
  });
});
