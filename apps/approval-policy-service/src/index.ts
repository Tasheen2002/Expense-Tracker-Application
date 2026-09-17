import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

import { OutboxWorker, HttpWebhookPublisher } from '@expense-tracker/outbox-kit';
import { ExemptionExpirationScheduler } from './workers/exemption-expiration.scheduler';

import { buildWebhookRoutes } from './shared/infrastructure/webhooks/webhook-routing';

const PORT = parseInt(process.env.PORT || '3005', 10);

const start = async () => {
  try {
    if (process.env.NODE_ENV === 'production' && !process.env.INTERNAL_API_KEY) {
      throw new Error('Fatal configuration error: INTERNAL_API_KEY is mandatory in production');
    }

    const { buildApprovalApp } = await import('./app');
    const fastify = await buildApprovalApp();

    const AUDIT_SERVICE_URL = process.env.AUDIT_SERVICE_URL || 'http://localhost:3009';
    const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008';
    const EXPENSE_SERVICE_URL = process.env.EXPENSE_SERVICE_URL || 'http://localhost:3003';
    
    const webhookRoutes = buildWebhookRoutes({
      auditServiceUrl: AUDIT_SERVICE_URL,
      notificationServiceUrl: NOTIFICATION_SERVICE_URL,
      expenseServiceUrl: EXPENSE_SERVICE_URL,
    });

    const publisher = new HttpWebhookPublisher(webhookRoutes);
    const outboxWorker = new OutboxWorker(fastify.compositionRoot.outboxEventRepository, publisher, {
      pollIntervalMs: 5000,
    });
    outboxWorker.start();

    const expirationScheduler = new ExemptionExpirationScheduler(
      fastify.compositionRoot.policyControls.expireExemptionsHandler,
      fastify.prisma,
      { internalApiKey: process.env.INTERNAL_API_KEY }
    );
    expirationScheduler.start();

    // Graceful shutdown hooks
    fastify.addHook('onClose', async () => {
      await Promise.allSettled([
        outboxWorker.stop(),
        expirationScheduler.stop(),
      ]);
    });

    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`[Approval-Policy-Service] Running on http://localhost:${PORT}`);

    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
    for (const signal of signals) {
      process.on(signal, async () => {
        fastify.log.info(`[Approval-Policy-Service] Received ${signal}, closing server gracefully...`);
        await fastify.close();
        process.exit(0);
      });
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[Approval-Policy-Service] Fatal startup error:', errMsg);
    process.exit(1);
  }
};

start();
