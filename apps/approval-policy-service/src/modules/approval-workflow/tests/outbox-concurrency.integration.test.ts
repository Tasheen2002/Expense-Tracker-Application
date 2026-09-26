import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '../../../shared/infrastructure/persistence/prisma.client';
import { PrismaOutboxEventRepository } from '../../../outbox/prisma-outbox.repository';

describe('PrismaOutboxEventRepository — Real PostgreSQL Concurrency in Approval (Integration)', () => {
  // 3 independent PrismaClient instances with isolated connection pools to model 3 distinct worker nodes
  let prismaAdmin: PrismaClient;
  let prismaWorker1: PrismaClient;
  let prismaWorker2: PrismaClient;
  let prismaWorker3: PrismaClient;

  let repoWorker1: PrismaOutboxEventRepository;
  let repoWorker2: PrismaOutboxEventRepository;
  let repoWorker3: PrismaOutboxEventRepository;

  const TEST_AGGREGATE_TYPE = 'ApprovalConcurrencyTest';

  beforeAll(async () => {
    prismaAdmin = new PrismaClient();
    prismaWorker1 = new PrismaClient();
    prismaWorker2 = new PrismaClient();
    prismaWorker3 = new PrismaClient();

    try {
      await prismaAdmin.$queryRaw`SELECT 1`;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      throw new Error(`[Approval Concurrency Integration] Database unavailable: ${errMsg}`);
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

  it('guarantees fair and mutually disjoint event claims across 3 concurrent worker connections', async () => {
    const TOTAL_EVENTS = 12;
    const BATCH_SIZE = 4;

    // claimPending scans the global queue, so place fixtures before any existing pending row.
    const oldestEvent = await prismaAdmin.outboxEvent.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });
    const baseTime = Math.min(Date.now(), oldestEvent?.createdAt.getTime() ?? Date.now())
      - (TOTAL_EVENTS + 1) * 1000;
    for (let i = 0; i < TOTAL_EVENTS; i++) {
      await prismaAdmin.outboxEvent.create({
        data: {
          aggregateType: TEST_AGGREGATE_TYPE,
          aggregateId: `chain-concurrency-${i}`,
          eventType: 'approval.chain.created',
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

    const fixtureRows = await prismaAdmin.outboxEvent.findMany({
      where: { aggregateType: TEST_AGGREGATE_TYPE },
      select: { id: true },
    });
    expect(new Set([...idsWorker1, ...idsWorker2, ...idsWorker3])).toEqual(
      new Set(fixtureRows.map((row) => row.id))
    );

    // Assert disjoint sets (no event claimed by more than 1 worker)
    const setWorker1 = new Set(idsWorker1);
    const setWorker2 = new Set(idsWorker2);
    const setWorker3 = new Set(idsWorker3);

    for (const id of idsWorker1) {
      expect(setWorker2.has(id)).toBe(false);
      expect(setWorker3.has(id)).toBe(false);
    }
    for (const id of idsWorker2) {
      expect(setWorker1.has(id)).toBe(false);
      expect(setWorker3.has(id)).toBe(false);
    }
    for (const id of idsWorker3) {
      expect(setWorker1.has(id)).toBe(false);
      expect(setWorker2.has(id)).toBe(false);
    }

    // Verify all 12 events in DB now have status PROCESSING and a valid leaseToken
    const processingRows = await prismaAdmin.outboxEvent.findMany({
      where: { aggregateType: TEST_AGGREGATE_TYPE },
    });
    expect(processingRows).toHaveLength(TOTAL_EVENTS);
    for (const row of processingRows) {
      expect(row.status).toBe('PROCESSING');
      expect(row.leaseToken).toBeDefined();
      expect(row.leaseToken).not.toBeNull();
      expect(row.leaseExpiresAt).toBeDefined();
      expect(new Date(row.leaseExpiresAt!).getTime()).toBeGreaterThan(Date.now());
    }
  });

  it('atomically fences out stale worker updates when another worker reclaimed the lease', async () => {
    // Seed before existing pending rows; otherwise a global claim may select another aggregate.
    const oldestEvent = await prismaAdmin.outboxEvent.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });
    const fixtureTime = Math.min(Date.now(), oldestEvent?.createdAt.getTime() ?? Date.now()) - 1000;
    const event = await prismaAdmin.outboxEvent.create({
      data: {
        aggregateType: TEST_AGGREGATE_TYPE,
        aggregateId: 'chain-fence-test',
        eventType: 'approval.chain.created',
        payload: {},
        status: 'PENDING',
        createdAt: new Date(fixtureTime),
      },
    });

    // Worker 1 claims event
    const [claimedByW1] = await repoWorker1.claimPending(1, 60_000);
    expect(claimedByW1).toBeDefined();
    expect(claimedByW1.id).toBe(event.id);
    expect(claimedByW1.leaseToken).toBeDefined();

    // Expire Worker 1's lease manually in database to simulate timeout
    await prismaAdmin.outboxEvent.update({
      where: { id: event.id },
      data: {
        leaseExpiresAt: new Date(Date.now() - 10_000), // expired 10s ago
      },
    });

    // Release expired leases (scheduled background recovery)
    const released = await repoWorker2.releaseExpiredLeases();
    expect(released).toBeGreaterThanOrEqual(1);

    // Verify specifically that our event was reset to PENDING with lease cleared
    const recoveredEvent = await prismaAdmin.outboxEvent.findUnique({
      where: { id: event.id },
    });
    expect(recoveredEvent?.status).toBe('PENDING');
    expect(recoveredEvent?.leaseToken).toBeNull();
    expect(recoveredEvent?.leaseExpiresAt).toBeNull();

    // Worker 2 reclaims the event with a new token
    const [claimedByW2] = await repoWorker2.claimPending(1, 60_000);
    expect(claimedByW2).toBeDefined();
    expect(claimedByW2.id).toBe(event.id);
    expect(claimedByW2.leaseToken).not.toBe(claimedByW1.leaseToken);

    // Worker 1 attempts to complete event using its stale leaseToken
    const w1Completion = await repoWorker1.updateStatus(event.id, 'PROCESSED', undefined, claimedByW1.leaseToken);
    expect(w1Completion).toBe(false); // Rejected! Fenced out!

    // Verify row status is still PROCESSING owned by Worker 2
    const currentDbRow = await prismaAdmin.outboxEvent.findUnique({
      where: { id: event.id },
    });
    expect(currentDbRow?.status).toBe('PROCESSING');
    expect(currentDbRow?.leaseToken).toBe(claimedByW2.leaseToken);

    // Worker 2 completes event with valid leaseToken
    const w2Completion = await repoWorker2.updateStatus(event.id, 'PROCESSED', undefined, claimedByW2.leaseToken);
    expect(w2Completion).toBe(true);

    const finalDbRow = await prismaAdmin.outboxEvent.findUnique({
      where: { id: event.id },
    });
    expect(finalDbRow?.status).toBe('PROCESSED');
  });
});
