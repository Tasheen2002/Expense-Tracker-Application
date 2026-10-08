// Separate process so the verifier can terminate a real worker during delivery.
import { OutboxWorker } from '../packages/outbox-kit/src/outbox-worker';
import { HttpWebhookPublisher } from '../packages/outbox-kit/src/outbox-publisher';
import { PrismaOutboxEventRepository } from '../apps/expense-budgeting-service/src/repositories/outbox-event.repository';

const { PrismaClient } = require(process.env.PRISMA_CLIENT_PATH!);
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
const publisher = new HttpWebhookPublisher({ 'expense.created': [process.env.CRASH_SUBSCRIBER_URL!] });
const worker = new OutboxWorker(new PrismaOutboxEventRepository(prisma), publisher, {
  pollIntervalMs: 250, batchSize: 1, leaseDurationMs: 60_000,
});
worker.start();
