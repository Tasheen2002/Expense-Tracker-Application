import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FastifyInstance } from 'fastify';
import { HttpWebhookPublisher, OutboxEventDTO } from '@expense-tracker/outbox-kit';
import { buildNotificationApp } from '../../../app';
import { PrismaClient } from '../../../prisma-client';

const testDatabase = process.env.NOTIFICATION_TEST_DATABASE_URL;
const enabled = Boolean(testDatabase && testDatabase === process.env.DATABASE_URL);

describe.skipIf(!enabled)('Notification webhook over HTTP with PostgreSQL', () => {
  const prisma = new PrismaClient();
  const workspaceId = randomUUID();
  const recipientId = randomUUID();
  const priorKey = process.env.INTERNAL_API_KEY;
  const internalKey = randomUUID();
  let app: FastifyInstance | undefined;
  let url: string;

  beforeAll(async () => {
    process.env.INTERNAL_API_KEY = internalKey;
    app = await buildNotificationApp({ logger: false, enableInternalAuth: true });
    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    url = `${address}/api/v1/event-outbox/events`;
  });

  afterAll(async () => {
    try {
      const notifications = await prisma.notification.findMany({ where: { workspaceId }, select: { id: true } });
      await prisma.outboxEvent.deleteMany({ where: { aggregateId: { in: notifications.map(row => row.id) } } });
      await prisma.notification.deleteMany({ where: { workspaceId } });
      await prisma.notificationRequest.deleteMany({ where: { workspaceId } });
    } finally {
      await app?.close();
      await prisma.$disconnect();
      if (priorKey === undefined) delete process.env.INTERNAL_API_KEY;
      else process.env.INTERNAL_API_KEY = priorKey;
    }
  });

  it('persists a failed-sync notification for its owner and deduplicates redelivery', async () => {
    const event: OutboxEventDTO = {
      id: randomUUID(),
      aggregateType: 'SyncSession',
      aggregateId: randomUUID(),
      eventType: 'SyncSessionFailed',
      payload: {
        workspaceId,
        userId: recipientId,
        connectionId: randomUUID(),
        errorMessage: 'provider token rejected',
      },
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      processedAt: null,
      retryCount: 0,
      error: null,
    };
    const publisher = new HttpWebhookPublisher({ SyncSessionFailed: [url] });

    await publisher.publish(event);
    await publisher.publish(event);

    expect(await prisma.notification.count({ where: { id: event.id } })).toBe(1);
    const notification = await prisma.notification.findUniqueOrThrow({ where: { id: event.id } });
    expect(notification).toMatchObject({
      workspaceId,
      recipientId,
      type: 'SYSTEM_ALERT',
      channel: 'IN_APP',
      priority: 'HIGH',
      title: 'Bank sync failed',
      status: 'SENT',
    });
    expect(notification.data).toMatchObject({ eventId: event.id, sourceEventType: event.eventType });
    expect(notification.content).not.toContain('provider token rejected');
  });

  it('rejects an event without internal authentication before writing', async () => {
    const eventId = randomUUID();
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ eventId, eventType: 'SyncSessionFailed', payload: { workspaceId, userId: recipientId } }),
    });

    expect(response.status).toBe(403);
    expect(await prisma.notification.findUnique({ where: { id: eventId } })).toBeNull();
  });

  it('rejects malformed authenticated events without creating a notification', async () => {
    const before = await prisma.notification.count({ where: { workspaceId } });
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-api-key': internalKey },
      body: JSON.stringify({ eventType: 'SyncSessionFailed', payload: { workspaceId, userId: recipientId } }),
    });

    expect(response.status).toBe(400);
    expect(await prisma.notification.count({ where: { workspaceId } })).toBe(before);
  });
});
