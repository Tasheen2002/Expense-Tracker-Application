import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// 1. Load service-local .env first (DATABASE_URL, PORT — service-specific config)
const localEnvPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(localEnvPath)) {
  const localEnvConfig = dotenv.parse(fs.readFileSync(localEnvPath));
  for (const k in localEnvConfig) {
    if (!process.env[k]) {
      process.env[k] = localEnvConfig[k];
    }
  }
}

// 2. Load root .env as fallback for shared config (JWT_SECRET, REDIS_URL, etc.)
const rootEnvPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(rootEnvPath)) {
  const rootEnvConfig = dotenv.parse(fs.readFileSync(rootEnvPath));
  for (const k in rootEnvConfig) {
    if (!process.env[k]) {
      process.env[k] = rootEnvConfig[k];
    }
  }
}

import { buildExpenseApp } from './app';
import { OutboxWorker, HttpWebhookPublisher } from '@expense-tracker/outbox-kit';
import { PrismaOutboxEventRepository } from './repositories/outbox-event.repository';
import { buildWebhookRoutes } from './shared/infrastructure/webhooks/webhook-routing';
import { BudgetExpirationWorker } from './modules/budget-management/infrastructure/workers/budget-expiration.worker';

const PORT = parseInt(process.env.PORT || '3003', 10);

const start = async () => {
  try {
    const fastify = await buildExpenseApp();

    // Start Outbox Worker with HttpWebhookPublisher
    const outboxRepo = new PrismaOutboxEventRepository(fastify.prisma);
    const AUDIT_SERVICE_URL = process.env.AUDIT_SERVICE_URL || 'http://localhost:3009';
    const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008';

    const webhookRoutes = buildWebhookRoutes({
      auditServiceUrl: AUDIT_SERVICE_URL,
      notificationServiceUrl: NOTIFICATION_SERVICE_URL,
    });

    const publisher = new HttpWebhookPublisher(webhookRoutes);
    const outboxWorker = new OutboxWorker(outboxRepo, publisher, {
      pollIntervalMs: 5000,
    });
    outboxWorker.start();
    const budgetExpirationWorker = new BudgetExpirationWorker(
      fastify.prisma,
      fastify.compositionRoot.budgetManagement.budgetService,
      (error) => fastify.log.error({ error }, 'Budget expiration processing failed')
    );
    await budgetExpirationWorker.start();

    // Graceful shutdown hooks
    fastify.addHook('onClose', async () => {
      await Promise.all([outboxWorker.stop(), budgetExpirationWorker.stop()]);
    });

    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`[Expense-Budgeting-Service] Running on http://localhost:${PORT}`);

    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
    for (const signal of signals) {
      process.on(signal, async () => {
        fastify.log.info(`[Expense-Budgeting-Service] Received ${signal}, closing server gracefully...`);
        await fastify.close();
        process.exit(0);
      });
    }
  } catch (err: any) {
    console.error('[Expense-Budgeting-Service] Fatal startup error:', err.message || err);
    process.exit(1);
  }
};

start();
