import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaOutboxEventRepository } from '../../../outbox/prisma-outbox.repository';
import { PrismaClient } from '../../../shared/infrastructure/persistence/prisma.client';

describe('PrismaOutboxEventRepository (Approval Unit Tests)', () => {
  let repository: PrismaOutboxEventRepository;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      outboxEvent: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      $queryRaw: vi.fn(),
      $executeRaw: vi.fn(),
      $transaction: vi.fn((callback: any) => callback(mockPrisma)),
    };

    repository = new PrismaOutboxEventRepository(mockPrisma as unknown as PrismaClient);
  });

  describe('save', () => {
    it('should create an outbox event with PENDING status and default values', async () => {
      mockPrisma.outboxEvent.create.mockResolvedValue({});

      await repository.save({
        aggregateType: 'ApprovalChain',
        aggregateId: 'chain-123',
        eventType: 'approval.chain.created',
        payload: { chainId: 'chain-123', workspaceId: 'ws-1' },
      });

      expect(mockPrisma.outboxEvent.create).toHaveBeenCalledWith({
        data: {
          aggregateType: 'ApprovalChain',
          aggregateId: 'chain-123',
          eventType: 'approval.chain.created',
          payload: { chainId: 'chain-123', workspaceId: 'ws-1' },
          status: 'PENDING',
        },
      });
    });
  });

  describe('findPending', () => {
    it('should return pending events mapped to OutboxEventDTO', async () => {
      const now = new Date();
      mockPrisma.outboxEvent.findMany.mockResolvedValue([
        {
          id: 'event-1',
          aggregateType: 'ExpenseWorkflow',
          aggregateId: 'wf-1',
          eventType: 'approval.workflow.initiated',
          payload: { workflowId: 'wf-1' },
          status: 'PENDING',
          retryCount: 0,
          deliveredTo: [],
          createdAt: now,
          nextAttemptAt: now,
          leaseToken: null,
          leaseExpiresAt: null,
          error: null,
          processedAt: null,
        },
      ]);

      const events = await repository.findPending(10);

      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('event-1');
      expect(mockPrisma.outboxEvent.findMany).toHaveBeenCalledWith({
        where: {
          status: 'PENDING',
        },
        orderBy: { createdAt: 'asc' },
        take: 10,
      });
    });
  });

  describe('claimPending', () => {
    it('should claim pending events using PostgreSQL FOR UPDATE SKIP LOCKED and return them', async () => {
      const claimedRow = {
        id: 'event-1',
        aggregateType: 'ApprovalChain',
        aggregateId: 'chain-1',
        eventType: 'approval.chain.created',
        payload: { chainId: 'chain-1' },
        status: 'PROCESSING',
        retryCount: 0,
        deliveredTo: [],
        createdAt: new Date(),
        nextAttemptAt: new Date(),
        leaseToken: 'lease-token-1',
        leaseExpiresAt: new Date(Date.now() + 60_000),
        error: null,
        processedAt: null,
      };

      mockPrisma.$queryRaw.mockResolvedValue([{ id: 'event-1' }]);
      mockPrisma.outboxEvent.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.outboxEvent.findMany.mockResolvedValue([claimedRow]);

      const events = await repository.claimPending(5, 60_000);

      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('event-1');
      expect(events[0].leaseToken).toBe('lease-token-1');
    });

    it('should return empty array if no rows were available to claim', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const events = await repository.claimPending(5);

      expect(events).toHaveLength(0);
    });
  });

  describe('claimFailed', () => {
    it('should claim failed events for retry within maxRetries limit', async () => {
      const claimedRow = {
        id: 'event-failed-1',
        aggregateType: 'PolicyViolation',
        aggregateId: 'viol-1',
        eventType: 'policy.violation.detected',
        payload: { violationId: 'viol-1' },
        status: 'PROCESSING',
        retryCount: 1,
        deliveredTo: [],
        createdAt: new Date(),
        nextAttemptAt: new Date(),
        leaseToken: 'retry-token-1',
        leaseExpiresAt: new Date(Date.now() + 60_000),
        error: 'Network failure',
        processedAt: null,
      };

      mockPrisma.$queryRaw.mockResolvedValue([{ id: 'event-failed-1' }]);
      mockPrisma.outboxEvent.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.outboxEvent.findMany.mockResolvedValue([claimedRow]);

      const events = await repository.claimFailed(5, 3, 60_000);

      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('event-failed-1');
      expect(events[0].retryCount).toBe(1);
    });
  });

  describe('releaseExpiredLeases', () => {
    it('should reset expired PROCESSING events back to PENDING and return count', async () => {
      mockPrisma.outboxEvent.updateMany.mockResolvedValue({ count: 2 });

      const count = await repository.releaseExpiredLeases();

      expect(count).toBe(2);
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
    it('should conditionally increment retry with leaseToken and return true on match', async () => {
      mockPrisma.outboxEvent.findFirst.mockResolvedValue({ retryCount: 1 });
      mockPrisma.outboxEvent.updateMany.mockResolvedValue({ count: 1 });

      const result = await repository.incrementRetry('event-1', 'Connection reset', 'valid-token');

      expect(result).toBe(true);
      expect(mockPrisma.outboxEvent.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'event-1',
          status: 'PROCESSING',
          leaseToken: 'valid-token',
        },
        data: expect.objectContaining({
          retryCount: { increment: 1 },
          error: 'Connection reset',
          status: 'FAILED',
          leaseToken: null,
          leaseExpiresAt: null,
          nextAttemptAt: expect.any(Date),
        }),
      });
    });

    it('should return false when leaseToken ownership was lost before incrementing retry', async () => {
      mockPrisma.outboxEvent.findFirst.mockResolvedValue(null);

      const result = await repository.incrementRetry('event-1', 'Connection reset', 'stale-token');

      expect(result).toBe(false);
      expect(mockPrisma.outboxEvent.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('markDelivered', () => {
    it('should fetch event and conditionally update deliveredTo array without leaseToken', async () => {
      mockPrisma.outboxEvent.findFirst.mockResolvedValue({ id: 'event-1', deliveredTo: [] });
      mockPrisma.outboxEvent.updateMany.mockResolvedValue({ count: 1 });

      const result = await repository.markDelivered('event-1', 'http://audit-service/webhook');

      expect(result).toBe(true);
      expect(mockPrisma.outboxEvent.findFirst).toHaveBeenCalledWith({
        where: { id: 'event-1', status: 'PROCESSING' },
        select: { id: true, deliveredTo: true },
      });
      expect(mockPrisma.outboxEvent.updateMany).toHaveBeenCalledWith({
        where: { id: 'event-1', status: 'PROCESSING' },
        data: {
          deliveredTo: ['http://audit-service/webhook'],
        },
      });
    });

    it('should atomically verify lease ownership and update deliveredTo when leaseToken provided', async () => {
      mockPrisma.outboxEvent.findFirst.mockResolvedValue({ id: 'event-1', deliveredTo: [] });
      mockPrisma.outboxEvent.updateMany.mockResolvedValue({ count: 1 });

      const result = await repository.markDelivered('event-1', 'http://audit-service/webhook', 'valid-token');

      expect(result).toBe(true);
      expect(mockPrisma.outboxEvent.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'event-1',
          leaseToken: 'valid-token',
          status: 'PROCESSING',
        },
        select: {
          id: true,
          deliveredTo: true,
        },
      });
      expect(mockPrisma.outboxEvent.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'event-1',
          status: 'PROCESSING',
          leaseToken: 'valid-token',
        },
        data: {
          deliveredTo: ['http://audit-service/webhook'],
        },
      });
    });

    it('should return true without update when subscriberUrl already in deliveredTo', async () => {
      mockPrisma.outboxEvent.findFirst.mockResolvedValue({ id: 'event-1', deliveredTo: ['http://audit-service/webhook'] });

      const result = await repository.markDelivered('event-1', 'http://audit-service/webhook', 'valid-token');

      expect(result).toBe(true);
      expect(mockPrisma.outboxEvent.updateMany).not.toHaveBeenCalled();
    });

    it('should return false when leaseToken is expired or claimed by another worker', async () => {
      mockPrisma.outboxEvent.findFirst.mockResolvedValue(null);

      const result = await repository.markDelivered('event-1', 'http://audit-service/webhook', 'stale-token');

      expect(result).toBe(false);
      expect(mockPrisma.outboxEvent.updateMany).not.toHaveBeenCalled();
    });

    it('should return false when updateMany count is 0 due to lease reclaimed before update', async () => {
      mockPrisma.outboxEvent.findFirst.mockResolvedValue({ id: 'event-1', deliveredTo: [] });
      mockPrisma.outboxEvent.updateMany.mockResolvedValue({ count: 0 });

      const result = await repository.markDelivered('event-1', 'http://audit-service/webhook', 'stale-token');

      expect(result).toBe(false);
    });
  });

  describe('renewLease', () => {
    it('should update leaseExpiresAt and return true when lease ownership matches', async () => {
      mockPrisma.outboxEvent.updateMany.mockResolvedValue({ count: 1 });

      const result = await repository.renewLease('event-1', 'active-token', 60_000);

      expect(result).toBe(true);
      expect(mockPrisma.outboxEvent.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'event-1',
          leaseToken: 'active-token',
          status: 'PROCESSING',
        },
        data: {
          leaseExpiresAt: expect.any(Date),
        },
      });
    });

    it('should return false when lease ownership was lost', async () => {
      mockPrisma.outboxEvent.updateMany.mockResolvedValue({ count: 0 });

      const result = await repository.renewLease('event-1', 'lost-token', 60_000);

      expect(result).toBe(false);
    });
  });

  describe('deleteProcessedBefore', () => {
    it('should delete PROCESSED events older than retention cutoff days', async () => {
      mockPrisma.outboxEvent.deleteMany.mockResolvedValue({ count: 15 });

      const deleted = await repository.deleteProcessedBefore(7);

      expect(deleted).toBe(15);
      expect(mockPrisma.outboxEvent.deleteMany).toHaveBeenCalledWith({
        where: {
          status: 'PROCESSED',
          createdAt: { lt: expect.any(Date) },
        },
      });
    });
  });
});
