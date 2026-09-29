import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { HttpWebhookPublisher } from '../../../../../../packages/outbox-kit/src/outbox-publisher';
import { buildAuditComplianceApp } from '../../../app';

describe('real publisher to audit service', () => {
  const prisma = new PrismaClient();
  const createdIds: string[] = [];
  let app: FastifyInstance | undefined;

  beforeAll(async () => {
    await prisma.$queryRaw`SELECT 1`;
    vi.stubEnv('INTERNAL_API_KEY', 'audit-publisher-test-key');
  });

  afterAll(async () => {
    if (app) await app.close();
    await prisma.auditLog.deleteMany({ where: { id: { in: createdIds } } });
    await prisma.$disconnect();
    vi.unstubAllEnvs();
  });

  it('authenticates, records once, retries failed delivery, and recovers', async () => {
    app = await buildAuditComplianceApp({ prisma, logger: false });
    await app.listen({ host: '127.0.0.1', port: 0 });
    const address = app.server.address();
    if (!address || typeof address === 'string') throw new Error('Audit service did not bind a port');
    const port = address.port;
    const url = `http://127.0.0.1:${port}/api/v1/event-outbox/events`;
    const publisher = new HttpWebhookPublisher({ 'expense.submitted': [url] });
    const workspaceId = randomUUID();
    const actorId = randomUUID();
    const makeEvent = (id: string) => ({
      id, eventType: 'expense.submitted', aggregateType: 'Expense', aggregateId: randomUUID(),
      payload: { workspaceId, submittedBy: actorId, amount: 25 },
      status: 'PROCESSING' as const, createdAt: '2026-01-01T12:00:00.000Z',
      processedAt: null, retryCount: 0, error: null,
    });
    const first = makeEvent(randomUUID());
    createdIds.push(first.id);
    await publisher.publish(first);
    await publisher.publish(first);
    expect(await prisma.auditLog.count({ where: { id: first.id } })).toBe(1);

    const rejected = await fetch(url, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-internal-api-key': 'wrong-key' },
      body: JSON.stringify({ eventId: randomUUID(), eventType: 'expense.submitted', payload: { workspaceId } }),
    });
    expect(rejected.status).toBe(403);

    const pending = makeEvent(randomUUID());
    createdIds.push(pending.id);
    await app.close();
    app = undefined;
    await expect(publisher.publish(pending)).rejects.toThrow();
    expect(await prisma.auditLog.count({ where: { id: pending.id } })).toBe(0);

    app = await buildAuditComplianceApp({ prisma, logger: false });
    await app.listen({ host: '127.0.0.1', port });
    await publisher.publish(pending);
    expect(await prisma.auditLog.count({ where: { id: pending.id } })).toBe(1);
  }, 30000);
});
