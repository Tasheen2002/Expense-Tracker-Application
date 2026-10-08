import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { HttpWebhookPublisher, type OutboxEventDTO } from '@expense-tracker/outbox-kit';
import { describe, expect, it } from 'vitest';
import { PrismaOutboxEventRepository } from '../../../repositories/outbox-event.repository';
import { buildWebhookRoutes } from '../../../shared/infrastructure/webhooks/webhook-routing';
import { EXPENSE_EVENTS } from '../../../shared/events/expense-events';

describe('expense outbox delivery', () => {
  it('delivers to audit and notification and records each subscriber once', async () => {
    const received: Array<{ path: string; body: Record<string, unknown> }> = [];
    const receiver = createServer(async (request, response) => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      received.push({
        path: request.url ?? '',
        body: JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>,
      });
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end('{}');
    });
    const prisma = new PrismaClient();
    const aggregateId = randomUUID();
    const payload = { expenseId: aggregateId, workspaceId: randomUUID(), expenseOwnerId: randomUUID(),
      changedBy: randomUUID(), oldStatus: 'SUBMITTED', newStatus: 'APPROVED' };
    let eventId: string | undefined;

    try {
      await new Promise<void>((resolve) => receiver.listen(0, '127.0.0.1', resolve));
      const address = receiver.address();
      if (!address || typeof address === 'string') throw new Error('HTTP receiver did not bind a port');
      const baseUrl = `http://127.0.0.1:${address.port}`;
      const routes = buildWebhookRoutes({
        auditServiceUrl: `${baseUrl}/audit`,
        notificationServiceUrl: `${baseUrl}/notification`,
      });
      const publisher = new HttpWebhookPublisher(routes);
      const repository = new PrismaOutboxEventRepository(prisma);
      const stored = await prisma.outboxEvent.create({
        data: {
          aggregateType: 'ExpenseDeliveryTest',
          aggregateId,
          eventType: EXPENSE_EVENTS.EXPENSE_STATUS_CHANGED,
          payload,
          status: 'PROCESSING',
          leaseToken: 'delivery-test-lease',
          leaseExpiresAt: new Date(Date.now() + 60_000),
        },
      });
      eventId = stored.id;
      const event: OutboxEventDTO = {
        id: stored.id,
        aggregateType: stored.aggregateType,
        aggregateId: stored.aggregateId,
        eventType: stored.eventType,
        payload,
        status: 'PROCESSING',
        createdAt: stored.createdAt.toISOString(),
        processedAt: null,
        retryCount: 0,
        error: null,
        deliveredTo: [],
        leaseToken: 'delivery-test-lease',
      };

      await publisher.publish(event, async (url) => {
        expect(await repository.markDelivered(stored.id, url, 'delivery-test-lease')).toBe(true);
      });
      const delivered = await prisma.outboxEvent.findUniqueOrThrow({ where: { id: stored.id } });
      expect(delivered.deliveredTo).toHaveLength(2);
      expect(received.map((entry) => entry.path).sort()).toEqual([
        '/audit/api/v1/event-outbox/events',
        '/notification/api/v1/event-outbox/events',
      ]);
      expect(received.every((entry) => entry.body.eventId === stored.id)).toBe(true);
      expect(received.every((entry) => JSON.stringify(entry.body.payload) === JSON.stringify(payload))).toBe(true);

      await publisher.publish({ ...event, deliveredTo: delivered.deliveredTo });
      expect(received).toHaveLength(2);
      expect(await repository.updateStatus(stored.id, 'PROCESSED', undefined, 'delivery-test-lease')).toBe(true);
      expect((await prisma.outboxEvent.findUniqueOrThrow({ where: { id: stored.id } })).status).toBe('PROCESSED');
    } finally {
      if (eventId) await prisma.outboxEvent.delete({ where: { id: eventId } });
      await prisma.$disconnect();
      if (receiver.listening) {
        await new Promise<void>((resolve, reject) => receiver.close((error) => error ? reject(error) : resolve()));
      }
    }
  });
});
