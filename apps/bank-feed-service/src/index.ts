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

import { buildBankFeedApp } from './app';
import { container } from './container';
import { OutboxWorker, HttpWebhookPublisher } from '@expense-tracker/outbox-kit';

const PORT = parseInt(process.env.PORT || '3006', 10);

const start = async () => {
  try {
    const fastify = await buildBankFeedApp();

    const outboxEventRepository = container.get<any>('outboxEventRepository');
    const AUDIT_SERVICE_URL = process.env.AUDIT_SERVICE_URL || 'http://localhost:3009';
    const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008';

    const webhookRoutes = {
      BankConnected: [`${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`],
      BankDisconnected: [`${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`],
      BankConnectionTokenUpdated: [`${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`],
      BankConnectionDeleted: [`${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`],
      SyncSessionStarted: [`${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`],
      SyncSessionCompleted: [`${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`],
      SyncSessionFailed: [
        `${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`,
        `${NOTIFICATION_SERVICE_URL}/api/v1/event-outbox/events`,
      ],
      BankTransactionsSynced: [`${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`],
      BankTransactionProcessed: [`${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`],
    };

    const publisher = new HttpWebhookPublisher(webhookRoutes);
    const outboxWorker = new OutboxWorker(outboxEventRepository, publisher, {
      pollIntervalMs: 5000,
    });
    outboxWorker.start();

    // Graceful shutdown hooks
    fastify.addHook('onClose', async () => {
      outboxWorker.stop();
    });

    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`[Bank-Feed-Service] Running on http://localhost:${PORT}`);

    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
    for (const signal of signals) {
      process.on(signal, async () => {
        fastify.log.info(`[Bank-Feed-Service] Received ${signal}, closing server gracefully...`);
        await fastify.close();
        process.exit(0);
      });
    }
  } catch (err: any) {
    console.error('[Bank-Feed-Service] Fatal startup error:', err.message || err);
    process.exit(1);
  }
};

start();
