import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaOutboxEventRepository } from '../repositories/outbox-event.repository';
import { retryFailedEvent } from './retry-failed-event';

const url = process.env.CATEGORIZATION_TEST_DATABASE_URL;
describe.skipIf(!url)('Categorization durable outbox', () => {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const replica = new PrismaClient({ datasources: { db: { url } } });
  const repo = new PrismaOutboxEventRepository(prisma), other = new PrismaOutboxEventRepository(replica);
  beforeAll(async () => {
    const [{ name }] = await prisma.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    if (!name.startsWith('codex_test_categorization_')) throw new Error('Dedicated test database required');
    await prisma.outboxEvent.deleteMany();
  });
  afterAll(async () => { await prisma.$disconnect(); await replica.$disconnect(); });
  async function pending() {
    return prisma.outboxEvent.create({ data: { aggregateId: randomUUID(), aggregateType: 'Test', eventType: 'Test',
      payload: {}, status: 'PENDING', createdAt: new Date(0) } });
  }
  it('retains pending, failed and recent events while deleting only expired processed events', async () => {
    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const rows = await Promise.all(['PROCESSED', 'PROCESSED', 'PENDING', 'FAILED', 'DEAD_LETTER'].map(async (status, index) => {
      const row = await pending();
      await prisma.outboxEvent.update({ where: { id: row.id }, data: {
        status: status as 'PROCESSED' | 'PENDING' | 'FAILED' | 'DEAD_LETTER',
        processedAt: index === 1 ? new Date() : old,
      } });
      return row;
    }));
    expect(await repo.deleteProcessedBefore(7)).toBe(1);
    expect(await prisma.outboxEvent.findUnique({ where: { id: rows[0].id } })).toBeNull();
    expect(await prisma.outboxEvent.count({ where: { id: { in: rows.slice(1).map(row => row.id) } } })).toBe(4);
    await prisma.outboxEvent.deleteMany({ where: { id: { in: rows.map(row => row.id) } } });
  });
  it('claims distinct events across worker instances and recovers a crashed lease', async () => {
    const a = await pending(), b = await pending();
    const [first, second] = await Promise.all([repo.claimPending(1), other.claimPending(1)]);
    expect(new Set([...first, ...second].map(event => event.id))).toEqual(new Set([a.id, b.id]));
    await prisma.outboxEvent.update({ where: { id: first[0].id }, data: { leaseExpiresAt: new Date(0) } });
    expect(await repo.renewLease(first[0].id, first[0].leaseToken!, 30000)).toBe(false);
    expect(await repo.incrementRetry(first[0].id, 'late failure', first[0].leaseToken)).toBe(false);
    expect(await repo.updateStatus(first[0].id, 'PROCESSED', null, first[0].leaseToken)).toBe(false);
    expect(await repo.releaseExpiredLeases()).toBe(1);
    const [reclaimed] = await other.claimPending(1);
    expect(reclaimed.leaseToken).not.toBe(first[0].leaseToken);
    expect(await repo.updateStatus(first[0].id, 'PROCESSED', null, first[0].leaseToken)).toBe(false);
    await repo.updateStatus(reclaimed.id, 'PROCESSED', null, reclaimed.leaseToken);
    await other.updateStatus(second[0].id, 'PROCESSED', null, second[0].leaseToken);
  });
  it('retains successful subscribers across delayed retry and operator requeue', async () => {
    const row = await pending(); const [event] = await repo.claimPending(1);
    await repo.markDelivered(row.id, 'http://audit/events', event.leaseToken);
    await repo.incrementRetry(row.id, 'Expense temporarily unavailable', event.leaseToken);
    expect(await repo.claimFailed(1, 5)).toHaveLength(0);
    await prisma.outboxEvent.update({ where: { id: row.id }, data: { status: 'DEAD_LETTER' } });
    expect(await retryFailedEvent(prisma, row.id)).toBe(true);
    const [retry] = await repo.claimPending(1);
    expect(retry.deliveredTo).toEqual(['http://audit/events']); expect(retry.retryCount).toBe(0);
    await repo.updateStatus(row.id, 'PROCESSED', null, retry.leaseToken);
    expect(await retryFailedEvent(prisma, row.id)).toBe(false);
  });
  it.each(['CategorySuggestionAccepted', 'CategorySuggestionCreated'])('refuses to invent missing metadata for legacy %s events', async eventType => {
    const row = await pending();
    await prisma.outboxEvent.update({ where: { id: row.id }, data: { status: 'DEAD_LETTER', eventType } });
    await expect(retryFailedEvent(prisma, row.id)).rejects.toThrow('Legacy');
    expect((await prisma.outboxEvent.findUniqueOrThrow({ where: { id: row.id } })).status).toBe('DEAD_LETTER');
  });
});
