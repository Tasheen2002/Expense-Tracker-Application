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

import { buildIdentityApp } from './app';
import { OutboxWorker, HttpWebhookPublisher } from '@expense-tracker/outbox-kit';
import { PrismaOutboxEventRepository } from './outbox/prisma-outbox.repository';

const PORT = parseInt(process.env.PORT || '3002', 10);

const start = async () => {
  try {
    const fastify = await buildIdentityApp();

    // Start Outbox Worker
    const outboxRepo = new PrismaOutboxEventRepository(fastify.prisma);
    const AUDIT_SERVICE_URL = process.env.AUDIT_SERVICE_URL || 'http://localhost:3009';
    const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008';

    const webhookRoutes = {
      'UserCreated': [
        `${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`,
        `${NOTIFICATION_SERVICE_URL}/api/v1/event-outbox/events`,
      ],
      'identity.user_created': [
        `${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`,
        `${NOTIFICATION_SERVICE_URL}/api/v1/event-outbox/events`,
      ],
      'WorkspaceCreated': [
        `${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`,
      ],
      'identity.workspace_created': [
        `${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`,
      ],
      'MemberJoinedWorkspace': [
        `${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`,
      ],
      'identity.member_joined': [
        `${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`,
      ],
      'MemberRoleChanged': [
        `${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`,
      ],
      'identity.member_role_changed': [
        `${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`,
      ],
    };

    const publisher = new HttpWebhookPublisher(webhookRoutes);
    const outboxWorker = new OutboxWorker(outboxRepo, publisher, {
      pollIntervalMs: 5000,
    });
    outboxWorker.start();

    // Graceful shutdown hooks
    fastify.addHook('onClose', async () => {
      outboxWorker.stop();
    });

    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`[Identity-Access-Service] Running on http://localhost:${PORT}`);

    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
    for (const signal of signals) {
      process.on(signal, async () => {
        fastify.log.info(`[Identity-Access-Service] Received ${signal}, closing server gracefully...`);
        await fastify.close();
        process.exit(0);
      });
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[Identity-Access-Service] Fatal startup error:', errMsg);
    process.exit(1);
  }
};

start();
