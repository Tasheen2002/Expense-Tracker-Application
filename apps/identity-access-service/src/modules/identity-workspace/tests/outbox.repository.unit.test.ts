import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaOutboxEventRepository } from '../../../outbox/prisma-outbox.repository';

describe('PrismaOutboxEventRepository (Unit)', () => {
  let repository: PrismaOutboxEventRepository;
  let mockPrisma: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = {
      $queryRaw: vi.fn(),
      outboxEvent: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        deleteMany: vi.fn(),
        create: vi.fn(),
      },
      $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => {
        return cb(mockPrisma);
      }),
    };
    repository = new PrismaOutboxEventRepository(mockPrisma);
  });

  describe('claimPending', () => {
    it('should atomically claim pending events using $queryRaw with FOR UPDATE SKIP LOCKED and return them', async () => {
      // 1. $queryRaw returns candidate IDs
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ id: 'event-1' }]);

      // 2. findMany fetches the newly claimed events matching the assigned leaseToken
      mockPrisma.outboxEvent.findMany.mockResolvedValueOnce([
        {
          id: 'event-1',
          aggregateType: 'User',
          aggregateId: 'u-1',
          eventType: 'UserRegistered',
          payload: {},
          status: 'PROCESSING',
          createdAt: new Date(),
          processedAt: null,
          retryCount: 0,
          error: null,
          deliveredTo: [],
          leaseToken: 'lease-123',
          leaseExpiresAt: new Date(Date.now() + 60000),
          nextAttemptAt: new Date(),
        },
      ]);

      mockPrisma.outboxEvent.updateMany.mockResolvedValue({ count: 1 });

      const claimed = await repository.claimPending(10, 60000);

      // Verify $queryRaw was called to fetch candidates with SKIP LOCKED
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);

      // Verify only the returned candidate IDs were updated
      expect(mockPrisma.outboxEvent.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['event-1'] },
          status: 'PENDING',
        },
        data: {
          status: 'PROCESSING',
          leaseToken: expect.any(String),
          leaseExpiresAt: expect.any(Date),
        },
      });

      // Verify findMany was only called once (for leased records), never for candidate fetching
      expect(mockPrisma.outboxEvent.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.outboxEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ['event-1'] },
            leaseToken: expect.any(String),
          }),
        })
      );

      expect(claimed).toHaveLength(1);
      expect(claimed[0].status).toBe('PROCESSING');
    });

    it('should return empty array if $queryRaw finds no candidates and skip updating', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      const claimed = await repository.claimPending(10);

      expect(claimed).toEqual([]);
      expect(mockPrisma.outboxEvent.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.outboxEvent.findMany).not.toHaveBeenCalled();
    });

    it('should fail fast and propagate error immediately if $queryRaw fails', async () => {
      const dbError = new Error('Connection terminated during raw lock query');
      mockPrisma.$queryRaw.mockRejectedValueOnce(dbError);

      await expect(repository.claimPending(10)).rejects.toThrow('Connection terminated during raw lock query');

      // Crucial: findMany MUST NOT be used as a silent fallback!
      expect(mockPrisma.outboxEvent.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.outboxEvent.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('claimFailed', () => {
    it('should claim failed retriable events using $queryRaw and propagate error if query fails', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ id: 'event-failed-1' }]);
      mockPrisma.outboxEvent.findMany.mockResolvedValueOnce([
        {
          id: 'event-failed-1',
          aggregateType: 'User',
          aggregateId: 'u-1',
          eventType: 'UserRegistered',
          payload: {},
          status: 'PROCESSING',
          createdAt: new Date(),
          processedAt: null,
          retryCount: 1,
          error: 'Previous attempt failed',
          deliveredTo: [],
          leaseToken: 'lease-failed-123',
          leaseExpiresAt: new Date(Date.now() + 60000),
          nextAttemptAt: new Date(),
        },
      ]);
      mockPrisma.outboxEvent.updateMany.mockResolvedValue({ count: 1 });

      const claimed = await repository.claimFailed(5, 3, 60000);

      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(mockPrisma.outboxEvent.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['event-failed-1'] },
          status: 'FAILED',
        },
        data: expect.objectContaining({ status: 'PROCESSING' }),
      });
      expect(claimed).toHaveLength(1);

      // Verify fail-fast when query fails
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('Deadlock detected'));
      await expect(repository.claimFailed(5, 3)).rejects.toThrow('Deadlock detected');
      expect(mockPrisma.outboxEvent.findMany).toHaveBeenCalledTimes(1); // not called again
    });
  });

  describe('releaseExpiredLeases', () => {
    it('should reset expired processing leases back to PENDING', async () => {
      mockPrisma.outboxEvent.updateMany.mockResolvedValue({ count: 3 });

      const releasedCount = await repository.releaseExpiredLeases();

      expect(releasedCount).toBe(3);
      expect(mockPrisma.outboxEvent.updateMany).toHaveBeenCalledWith({
        where: {
          status: 'PROCESSING',
          leaseExpiresAt: { lt: expect.any(Date) },
        },
        data: {
          status: 'PENDING',
          leaseToken: null,
          leaseExpiresAt: null,
        },
      });
    });
  });

  describe('incrementRetry', () => {
    it('should increment retryCount and schedule exponential backoff', async () => {
      mockPrisma.outboxEvent.findUnique.mockResolvedValue({ retryCount: 1 });
      mockPrisma.outboxEvent.update.mockResolvedValue({});

      await repository.incrementRetry('event-1', 'Network timeout');

      expect(mockPrisma.outboxEvent.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: expect.objectContaining({
          retryCount: { increment: 1 },
          error: 'Network timeout',
          status: 'FAILED',
          leaseToken: null,
          leaseExpiresAt: null,
          nextAttemptAt: expect.any(Date),
        }),
      });
    });
  });

  describe('markDelivered', () => {
    it('should push subscriber URL to deliveredTo array', async () => {
      mockPrisma.outboxEvent.update.mockResolvedValue({});

      await repository.markDelivered('event-1', 'http://webhook.com');

      expect(mockPrisma.outboxEvent.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: {
          deliveredTo: { push: 'http://webhook.com' },
        },
      });
    });
  });
});
