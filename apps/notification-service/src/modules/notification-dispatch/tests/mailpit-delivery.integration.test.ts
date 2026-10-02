import Fastify from 'fastify';
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '../../../prisma-client';
import { buildNotificationApp } from '../../../app';
import { NotificationType } from '../domain/enums';

const url = process.env.MAILPIT_TEST_URL;
const database = process.env.NOTIFICATION_TEST_DATABASE_URL;
describe.skipIf(!url || !database || database !== process.env.DATABASE_URL)('Mailpit capture with PostgreSQL and the real worker', () => {
  const prisma = new PrismaClient();
  const workspaceId = randomUUID(), recipientId = randomUUID();
  afterAll(async () => {
    const rows = await prisma.notification.findMany({ where: { workspaceId }, select: { id: true } });
    await prisma.outboxEvent.deleteMany({ where: { aggregateId: { in: rows.map(row => row.id) } } });
    await prisma.notification.deleteMany({ where: { workspaceId } });
    await prisma.notificationRequest.deleteMany({ where: { workspaceId } });
    await prisma.$disconnect();
  });
  it('captures one queued email, marks it delivered, and deduplicates command replay', async () => {
    // A controlled HTTP Identity fixture verifies the real lookup adapter contract.
    const identity = Fastify({ logger: false });
    identity.get('/api/v1/users/:id', async request => {
      expect(request.headers['x-internal-api-key']).toBe('mailpit-test-key');
      expect(request.headers['x-user-id']).toBe(recipientId);
      expect((request.params as { id: string }).id).toBe(recipientId);
      return { data: { userId: recipientId, email: 'developer@example.test' } };
    });
    await identity.listen({ port: 0, host: '127.0.0.1' });
    const address = identity.server.address();
    if (!address || typeof address === 'string') throw new Error('Identity fixture did not bind');
    vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('NOTIFICATION_EMAIL_PROVIDER', 'mailpit');
    vi.stubEnv('MAILPIT_URL', url!); vi.stubEnv('NOTIFICATION_EMAIL_FROM', 'notifications@expense-tracker.test');
    vi.stubEnv('INTERNAL_API_KEY', 'mailpit-test-key');
    vi.stubEnv('IDENTITY_SERVICE_URL', `http://127.0.0.1:${address.port}`);
    const app = await buildNotificationApp({ prisma, logger: false });
    try {
      const input = { requestId: randomUUID(), workspaceId, recipientId, type: NotificationType.SYSTEM_ALERT,
        title: `Expense Tracker Mailpit smoke test ${workspaceId.slice(0, 8)}`,
        content: '<p>Your Notification Service captured this email locally.</p>', data: {} };
      const accepted = await app.compositionRoot.sendNotificationHandler.handle(input);
      const email = accepted.data!.find(row => row.channel === 'EMAIL');
      expect(email).toBeDefined();
      const captureId = vi.fn();
      const realFetch = globalThis.fetch;
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (resource, options) => {
        const response = await realFetch(resource, options);
        if (String(resource) === `${url}/api/v1/send`) {
          captureId((await response.clone().json() as { ID: string }).ID);
        }
        return response;
      });
      app.compositionRoot.workers.email!.start();
      await vi.waitFor(async () => {
        expect((await prisma.emailDelivery.findUniqueOrThrow({ where: { notificationId: email!.id } })).status).toBe('DELIVERED');
      }, { timeout: 15000, interval: 100 });
      expect(captureId).toHaveBeenCalledOnce();
      const captured = await realFetch(`${url}/api/v1/message/${captureId.mock.calls[0][0]}`);
      expect(captured.ok).toBe(true);
      expect(await captured.json()).toMatchObject({ Subject: input.title, HTML: input.content,
        To: [{ Address: 'developer@example.test' }] });
      expect((await prisma.notification.findUniqueOrThrow({ where: { id: email!.id } })).status).toBe('SENT');
      await app.compositionRoot.sendNotificationHandler.handle(input);
      expect(await prisma.emailDelivery.count({ where: { notificationId: email!.id } })).toBe(1);
      expect(captureId).toHaveBeenCalledOnce();
    } finally {
      await app.close(); await identity.close(); vi.restoreAllMocks(); vi.unstubAllEnvs();
    }
  });
});
