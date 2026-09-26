import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaOutboxEventRepository } from '../../../repositories/outbox-event.repository';

describe('PrismaOutboxEventRepository — Real PostgreSQL Concurrency in Expense Ledger (Integration)', () => {
  // 3 independent PrismaClient instances with isolated connection pools to model 3 distinct worker nodes
  let prismaAdmin: PrismaClient;
  let prismaWorker1: PrismaClient;
  let prismaWorker2: PrismaClient;
  let prismaWorker3: PrismaClient;

  let repoWorker1: PrismaOutboxEventRepository;
  let repoWorker2: PrismaOutboxEventRepository;
  let repoWorker3: PrismaOutboxEventRepository;

  const TEST_AGGREGATE_TYPE = 'ExpenseConcurrencyTest';

  beforeAll(async () => {
    prismaAdmin = new PrismaClient();
    prismaWorker1 = new PrismaClient();
    prismaWorker2 = new PrismaClient();
    prismaWorker3 = new PrismaClient();

    try {
      await prismaAdmin.$queryRaw`SELECT 1`;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      throw new Error(`[Expense Concurrency Integration] Database unavailable: ${errMsg}`);
    }

    // 3 distinct repository instances backed by separate client connections
    repoWorker1 = new PrismaOutboxEventRepository(prismaWorker1);
    repoWorker2 = new PrismaOutboxEventRepository(prismaWorker2);
    repoWorker3 = new PrismaOutboxEventRepository(prismaWorker3);
  });

  afterAll(async () => {
    try {
      await prismaAdmin.outboxEvent.deleteMany({
        where: { aggregateType: TEST_AGGREGATE_TYPE },
      });
    } catch {
      // Best-effort cleanup
    }
    await Promise.allSettled([
      prismaAdmin.$disconnect(),
      prismaWorker1.$disconnect(),
      prismaWorker2.$disconnect(),
      prismaWorker3.$disconnect(),
    ]);
  });

  beforeEach(async () => {
    await prismaAdmin.outboxEvent.deleteMany({
      where: { aggregateType: TEST_AGGREGATE_TYPE },
    });
  });

  it('guarantees fair and mutually disjoint event claims across 3 concurrent worker connections using FOR UPDATE SKIP LOCKED', async () => {
    const TOTAL_EVENTS = 12;
    const BATCH_SIZE = 4;

    // Seed 12 pending events via admin
    const baseTime = Date.now() - 3600_000;
    for (let i = 0; i < TOTAL_EVENTS; i++) {
      await prismaAdmin.outboxEvent.create({
        data: {
          aggregateType: TEST_AGGREGATE_TYPE,
          aggregateId: `expense-concurrency-${i}`,
          eventType: 'expense.created',
          payload: { index: i },
          status: 'PENDING',
          createdAt: new Date(baseTime + i * 1000),
        },
      });
    }

    // Launch 3 workers concurrently attempting to claim BATCH_SIZE events simultaneously
    const [batchWorker1, batchWorker2, batchWorker3] = await Promise.all([
      repoWorker1.claimPending(BATCH_SIZE, 60_000),
      repoWorker2.claimPending(BATCH_SIZE, 60_000),
      repoWorker3.claimPending(BATCH_SIZE, 60_000),
    ]);

    const idsWorker1 = batchWorker1.map((e) => e.id);
    const idsWorker2 = batchWorker2.map((e) => e.id);
    const idsWorker3 = batchWorker3.map((e) => e.id);

    const totalClaimed = idsWorker1.length + idsWorker2.length + idsWorker3.length;
    expect(totalClaimed).toBe(TOTAL_EVENTS);

    // Verify completely disjoint sets (zero duplicate claims across workers)
    const set1 = new Set(idsWorker1);
    const set2 = new Set(idsWorker2);
    const set3 = new Set(idsWorker3);

    for (const id of idsWorker1) {
      expect(set2.has(id)).toBe(false);
      expect(set3.has(id)).toBe(false);
    }
    for (const id of idsWorker2) {
      expect(set1.has(id)).toBe(false);
      expect(set3.has(id)).toBe(false);
    }

    // Verify all rows are PROCESSING with valid leaseTokens
    for (const event of [...batchWorker1, ...batchWorker2, ...batchWorker3]) {
      expect(event.status).toBe('PROCESSING');
      expect(event.leaseToken).toBeTruthy();
      expect(event.leaseExpiresAt).toBeTruthy();
    }
  });

  it('recovers expired leases via releaseExpiredLeases()', async () => {
    // Seed an event with an expired lease
    const expiredDate = new Date(Date.now() - 10_000);
    const event = await prismaAdmin.outboxEvent.create({
      data: {
        aggregateType: TEST_AGGREGATE_TYPE,
        aggregateId: 'expired-lease-test',
        eventType: 'expense.updated',
        payload: { test: true },
        status: 'PROCESSING',
        leaseToken: 'expired-token-123',
        leaseExpiresAt: expiredDate,
      },
    });

    const released = await repoWorker1.releaseExpiredLeases();
    expect(released).toBeGreaterThanOrEqual(1);

    const reloaded = await prismaAdmin.outboxEvent.findUnique({
      where: { id: event.id },
    });
    expect(reloaded?.status).toBe('PENDING');
    expect(reloaded?.leaseToken).toBeNull();
    expect(reloaded?.leaseExpiresAt).toBeNull();
  });

  it('atomically tracks deliveredTo subscribers without duplicate entries', async () => {
    const event = await prismaAdmin.outboxEvent.create({
      data: {
        aggregateType: TEST_AGGREGATE_TYPE,
        aggregateId: 'delivery-test',
        eventType: 'expense.approved',
        payload: { test: true },
        status: 'PROCESSING',
        leaseToken: 'token-abc',
        leaseExpiresAt: new Date(Date.now() + 60_000),
      },
    });

    const sub1 = 'http://localhost:3008/api/v1/event-outbox/events';
    const sub2 = 'http://localhost:3009/api/v1/event-outbox/events';

    // First delivery succeeds
    const d1 = await repoWorker1.markDelivered(event.id, sub1, 'token-abc');
    expect(d1).toBe(true);

    // Duplicate delivery returns true without adding duplicate
    const d1Dup = await repoWorker1.markDelivered(event.id, sub1, 'token-abc');
    expect(d1Dup).toBe(true);

    // Second subscriber delivery
    const d2 = await repoWorker1.markDelivered(event.id, sub2, 'token-abc');
    expect(d2).toBe(true);

    const reloaded = await prismaAdmin.outboxEvent.findUnique({
      where: { id: event.id },
    });
    expect(reloaded?.deliveredTo).toEqual([sub1, sub2]);
  });
});
