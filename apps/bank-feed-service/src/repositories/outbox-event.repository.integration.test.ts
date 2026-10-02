import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createServer } from 'node:http';
import { HttpWebhookPublisher, OutboxWorker } from '@expense-tracker/outbox-kit';
import { PrismaOutboxEventRepository } from './outbox-event.repository';

const isolatedDatabase = process.env.BANK_FEED_OUTBOX_TEST_DATABASE_URL;

describe.skipIf(!isolatedDatabase || isolatedDatabase === process.env.DATABASE_URL)(
  'bank-feed outbox leases', () => {
    const prisma = new PrismaClient({ datasources: { db: { url: isolatedDatabase } } });
    const repository = new PrismaOutboxEventRepository(prisma);
    const aggregateIds: string[] = [];

    async function createEvent() {
      const aggregateId = crypto.randomUUID();
      aggregateIds.push(aggregateId);
      await repository.save({ aggregateId, aggregateType: 'BankConnection', eventType: 'BankConnectionCreated', payload: { workspaceId: crypto.randomUUID() } });
      return prisma.outboxEvent.findFirstOrThrow({ where: { aggregateId } });
    }

    afterEach(async () => {
      await prisma.outboxEvent.deleteMany({ where: { aggregateId: { in: aggregateIds.splice(0) } } });
    });

    afterAll(async () => {
      await prisma.$disconnect();
    });

    it('claims each pending event only once across concurrent workers', async () => {
      const event = await createEvent();
      const [first, second] = await Promise.all([repository.claimPending(1), repository.claimPending(1)]);
      expect([...first, ...second].map((claimed) => claimed.id)).toEqual([event.id]);
      const claimed = [...first, ...second][0];
      expect(claimed.leaseToken).toBeTruthy();
      expect(await repository.updateStatus(event.id, 'PROCESSED', null, 'wrong-token')).toBe(false);
      expect(await repository.updateStatus(event.id, 'PROCESSED', null, claimed.leaseToken)).toBe(true);
    });

    it('preserves delivered subscribers and retries only after backoff', async () => {
      const event = await createEvent();
      const [claimed] = await repository.claimPending(1);
      const subscriber = 'http://audit-service/events';
      expect(await repository.markDelivered(event.id, subscriber, claimed.leaseToken)).toBe(true);
      expect(await repository.incrementRetry(event.id, 'notification unavailable', claimed.leaseToken)).toBe(true);
      expect(await repository.claimFailed(1, 5)).toEqual([]);
      await prisma.outboxEvent.update({ where: { id: event.id }, data: { nextAttemptAt: new Date(Date.now() - 1000) } });
      const [retry] = await repository.claimFailed(1, 5);
      expect(retry.id).toBe(event.id);
      expect(retry.deliveredTo).toEqual([subscriber]);
      expect(retry.retryCount).toBe(1);
    });

    it('preserves concurrent subscriber acknowledgements without duplicates', async () => {
      const event = await createEvent();
      const [claimed] = await repository.claimPending(1);
      const urls = ['http://audit/events', 'http://notification/events', 'http://audit/events'];
      expect(await Promise.all(urls.map((url) => repository.markDelivered(event.id, url, claimed.leaseToken)))).toEqual([true, true, true]);
      const row = await prisma.outboxEvent.findUniqueOrThrow({ where: { id: event.id } });
      expect(row.deliveredTo.sort()).toEqual([...new Set(urls)].sort());
    });

    it('recovers a crashed worker after its lease expires', async () => {
      const event = await createEvent();
      const [original] = await repository.claimPending(1);
      await prisma.outboxEvent.update({ where: { id: event.id }, data: { leaseExpiresAt: new Date(Date.now() - 1000) } });
      expect(await repository.releaseExpiredLeases()).toBe(1);
      const [reclaimed] = await repository.claimPending(1);
      expect(reclaimed.id).toBe(event.id);
      expect(reclaimed.leaseToken).not.toBe(original.leaseToken);
      expect(await repository.markDelivered(event.id, 'http://audit-service/events', original.leaseToken)).toBe(false);
    });

    it('delivers to Audit once while retrying a temporarily unavailable Notification subscriber', async () => {
      let auditRequests = 0;
      let notificationRequests = 0;
      let notificationUnavailable = true;
      const audit = createServer((_request, response) => {
        auditRequests++;
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end('{}');
      });
      const notification = createServer((_request, response) => {
        notificationRequests++;
        response.writeHead(notificationUnavailable ? 503 : 200, { 'content-type': 'application/json' });
        response.end('{}');
      });
      const listen = async (server: typeof audit) => {
        await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
        const address = server.address();
        if (!address || typeof address === 'string') throw new Error('Expected TCP address');
        return `http://127.0.0.1:${address.port}/events`;
      };
      const auditUrl = await listen(audit);
      const notificationUrl = await listen(notification);
      const publisher = new HttpWebhookPublisher({ BankConnectionCreated: [auditUrl, notificationUrl] });
      const worker = new OutboxWorker(repository, publisher, { pollIntervalMs: 50, maxRetries: 3 });
      const waitForStatus = async (id: string, status: 'FAILED' | 'PROCESSED') => {
        const deadline = Date.now() + 15_000;
        while (Date.now() < deadline) {
          const row = await prisma.outboxEvent.findUniqueOrThrow({ where: { id } });
          if (row.status === status) return row;
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        throw new Error(`Outbox event did not reach ${status}`);
      };

      try {
        const event = await createEvent();
        worker.start();
        const failed = await waitForStatus(event.id, 'FAILED');
        expect(failed.deliveredTo).toEqual([auditUrl]);
        notificationUnavailable = false;
        await prisma.outboxEvent.update({
          where: { id: event.id }, data: { nextAttemptAt: new Date(Date.now() - 1000) },
        });
        const delivered = await waitForStatus(event.id, 'PROCESSED');
        expect(delivered.deliveredTo).toEqual([auditUrl, notificationUrl]);
        expect(auditRequests).toBe(1);
        expect(notificationRequests).toBeGreaterThan(1);
      } finally {
        await worker.stop();
        await Promise.all([audit, notification].map((server) =>
          new Promise<void>((resolve) => server.close(() => resolve()))));
      }
    });
  }
);
