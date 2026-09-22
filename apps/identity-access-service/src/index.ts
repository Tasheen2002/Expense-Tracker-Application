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
import { PrismaOutboxEventRepository } from './outbox/prisma-outbox.repository';
import { IdentityPersistenceContext } from './shared/infrastructure/persistence/identity-persistence.context';
import { SessionRepositoryImpl } from './modules/identity-workspace/infrastructure/persistence/session.repository.impl';
import { WorkspaceInvitationRepositoryImpl } from './modules/identity-workspace/infrastructure/persistence/workspace-invitation.repository.impl';
import { CleanupScheduler } from './workers/cleanup.scheduler';
import { buildWebhookRoutes } from './shared/infrastructure/webhooks/webhook-routing';

const PORT = parseInt(process.env.PORT || '3002', 10);

const start = async () => {
  try {
    if (process.env.NODE_ENV === 'production' && !process.env.INTERNAL_API_KEY) {
      throw new Error('Fatal configuration error: INTERNAL_API_KEY is mandatory in production');
    }

    const { buildIdentityApp } = await import('./app');
    const fastify = await buildIdentityApp();

    // Start Outbox Worker with exhaustive event routing
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

    // Scheduled Maintenance: periodic cleanup for expired sessions, invitations, and outbox logs
    const persistenceContext = new IdentityPersistenceContext(fastify.prisma);
    const sessionRepo = new SessionRepositoryImpl(persistenceContext);
    const invitationRepo = new WorkspaceInvitationRepositoryImpl(persistenceContext);
    const cleanupScheduler = new CleanupScheduler(sessionRepo, invitationRepo, outboxRepo, {
      logger: fastify.log,
    });
    cleanupScheduler.start();

    // Graceful shutdown hooks
    fastify.addHook('onClose', async () => {
      await Promise.allSettled([
        cleanupScheduler.stop(),
        outboxWorker.stop(),
      ]);
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
