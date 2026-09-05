import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaOutboxEventRepository } from '../../../outbox/prisma-outbox.repository';

describe('PrismaOutboxEventRepository — Real PostgreSQL Concurrency (Integration)', () => {
  // 3 independent PrismaClient instances with isolated connection pools to model 3 distinct worker nodes
  let prismaAdmin: PrismaClient;
  let prismaWorker1: PrismaClient;
  let prismaWorker2: PrismaClient;
  let prismaWorker3: PrismaClient;

  let repoWorker1: PrismaOutboxEventRepository;
  let repoWorker2: PrismaOutboxEventRepository;
  let repoWorker3: PrismaOutboxEventRepository;

  const TEST_AGGREGATE_TYPE = 'ConcurrencyTest';

  beforeAll(async () => {
    prismaAdmin = new PrismaClient();
    prismaWorker1 = new PrismaClient();
    prismaWorker2 = new PrismaClient();
    prismaWorker3 = new PrismaClient();

    try {
      await prismaAdmin.$queryRaw`SELECT 1`;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      throw new Error(`[Integration Test Setup] Database unavailable: ${errMsg}`);
    }

    // 3 distinct repository instances backed by separate client connections
    repoWorker1 = new PrismaOutboxEventRepository(prismaWorker1);
    repoWorker2 = new PrismaOutboxEventRepository(prismaWorker2);
    repoWorker3 = new PrismaOutboxEventRepository(prismaWorker3);
  });

  afterAll(async () => {
    await prismaAdmin.outboxEvent.deleteMany({
      where: { aggregateType: TEST_AGGREGATE_TYPE },
    });
    await Promise.all([
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

  it('guarantees fair and mutually disjoint event claims across 3 concurrent worker connections', async () => {
    const TOTAL_EVENTS = 12;
    const BATCH_SIZE = 4;

    // Seed 12 pending events via admin
    for (let i = 0; i < TOTAL_EVENTS; i++) {
      await repoWorker1.save({
        aggregateType: TEST_AGGREGATE_TYPE,
        aggregateId: `agg-${i}`,
        eventType: 'OrderPlaced',
        payload: { itemIndex: i, timestamp: Date.now() },
      });
    }

    // Simultaneously invoke claimPending across 3 independent workers
    const [batch1, batch2, batch3] = await Promise.all([
      repoWorker1.claimPending(BATCH_SIZE, 60_000),
      repoWorker2.claimPending(BATCH_SIZE, 60_000),
      repoWorker3.claimPending(BATCH_SIZE, 60_000),
    ]);

    // 1. Assert full and fair claiming: each worker claims exactly its requested batch size
    expect(batch1).toHaveLength(BATCH_SIZE);
    expect(batch2).toHaveLength(BATCH_SIZE);
    expect(batch3).toHaveLength(BATCH_SIZE);

    const ids1 = batch1.map((e) => e.id);
    const ids2 = batch2.map((e) => e.id);
    const ids3 = batch3.map((e) => e.id);

    const allClaimedIds = [...ids1, ...ids2, ...ids3];
    const uniqueClaimedIds = new Set(allClaimedIds);

    // 2. Proves all 12 events were claimed and no duplicate claims occurred
    expect(allClaimedIds).toHaveLength(TOTAL_EVENTS);
    expect(uniqueClaimedIds.size).toBe(TOTAL_EVENTS);

    // 3. Proves strictly disjoint sets between each pair of workers
    const overlap12 = ids1.filter((id) => ids2.includes(id));
    const overlap13 = ids1.filter((id) => ids3.includes(id));
    const overlap23 = ids2.filter((id) => ids3.includes(id));

    expect(overlap12).toHaveLength(0);
    expect(overlap13).toHaveLength(0);
    expect(overlap23).toHaveLength(0);

    // 4. Every claimed event has status PROCESSING, unique leaseToken, and future lease expiration
    const leaseTokens = new Set<string>();
    for (const event of [...batch1, ...batch2, ...batch3]) {
      expect(event.status).toBe('PROCESSING');
      expect(event.leaseToken).toBeDefined();
      expect(typeof event.leaseToken).toBe('string');
      expect(event.leaseExpiresAt).toBeDefined();
      expect(new Date(event.leaseExpiresAt!).getTime()).toBeGreaterThan(Date.now());
      leaseTokens.add(event.leaseToken!);
    }
    // Each worker transaction generates its own unique lease token
    expect(leaseTokens.size).toBeGreaterThanOrEqual(3);
  });

  it('recovers expired leases back to PENDING status', async () => {
    // Seed 1 pending event
    await repoWorker1.save({
      aggregateType: TEST_AGGREGATE_TYPE,
      aggregateId: 'expired-agg',
      eventType: 'OrderPlaced',
      payload: { test: true },
    });

    // Worker 1 claims the event with a 1ms lease
    const claimed = await repoWorker1.claimPending(1, 1);
    expect(claimed).toHaveLength(1);
    const eventId = claimed[0].id;

    // Wait 25ms for lease to expire
    await new Promise((resolve) => setTimeout(resolve, 25));

    // Worker 2 triggers lease recovery
    const recoveredCount = await repoWorker2.releaseExpiredLeases();
    expect(recoveredCount).toBeGreaterThanOrEqual(1);

    // Verify in DB that event is back to PENDING and lease token cleared
    const recoveredEvent = await prismaAdmin.outboxEvent.findUnique({
      where: { id: eventId },
    });
    expect(recoveredEvent?.status).toBe('PENDING');
    expect(recoveredEvent?.leaseToken).toBeNull();
    expect(recoveredEvent?.leaseExpiresAt).toBeNull();
  });
});
