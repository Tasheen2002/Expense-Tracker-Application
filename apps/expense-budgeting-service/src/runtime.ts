import { FastifyInstance } from 'fastify';
import { buildExpenseApp, ExpenseAppOptions } from './app';
import { OutboxWorker, HttpWebhookPublisher } from '@expense-tracker/outbox-kit';
import { PrismaOutboxEventRepository } from './repositories/outbox-event.repository';
import { buildWebhookRoutes } from './shared/infrastructure/webhooks/webhook-routing';
import { BudgetExpirationWorker } from './modules/budget-management/infrastructure/workers/budget-expiration.worker';

export interface ManagedWorker { start(): void | Promise<void>; stop(): Promise<void>; }
interface SignalSource {
  on(event: 'SIGTERM' | 'SIGINT', listener: () => void): unknown;
  off(event: 'SIGTERM' | 'SIGINT', listener: () => void): unknown;
}

function createWorkers(fastify: FastifyInstance): readonly ManagedWorker[] {
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
  const budgetExpirationWorker = new BudgetExpirationWorker(
    fastify.prisma,
    fastify.compositionRoot.budgetManagement.budgetService,
    (error) => fastify.log.error({ error }, 'Budget expiration processing failed')
  );

  return [outboxWorker, budgetExpirationWorker];
}

export async function startExpenseService(options: ExpenseAppOptions & {
  port?: number; host?: string; installSignalHandlers?: boolean; signalSource?: SignalSource;
  workersFactory?: (app: FastifyInstance) => readonly ManagedWorker[];
} = {}) {
  const rawPort = options.port ?? process.env.PORT ?? '3003';
  if (typeof rawPort === 'string' && !/^\d+$/.test(rawPort)) throw new Error('PORT must be an integer between 0 and 65535');
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT must be an integer between 0 and 65535');
  let workers: readonly ManagedWorker[] = [];
  const app = await buildExpenseApp({ ...options, beforeDatabaseDisconnect: async () => {
    const results = await Promise.allSettled(workers.map(worker => Promise.resolve().then(() => worker.stop())));
    await options.beforeDatabaseDisconnect?.();
    const failed = results.find(result => result.status === 'rejected');
    if (failed?.status === 'rejected') throw failed.reason;
  } });
  try {
    workers = (options.workersFactory ?? createWorkers)(app);
    if (options.installSignalHandlers) {
      const dispose = installShutdownHandlers(app, options.signalSource);
      app.addHook('onClose', async () => { dispose(); });
    }
    const health = await app.inject('/health');
    if (health.statusCode !== 200) throw new Error('Database schema is not ready');
    await app.listen({ port, host: options.host ?? '0.0.0.0' });
    for (const worker of workers) await worker.start();
    app.log.info({ address: app.server.address() }, 'expense-budgeting-service listening');
    return app;
  } catch (error: unknown) {
    try { await app.close(); } catch (cleanupError: unknown) { app.log.error({ err: cleanupError }, 'Startup cleanup failed'); }
    throw error;
  }
}

export function installShutdownHandlers(app: FastifyInstance, signals: SignalSource = process) {
  let closing: Promise<void> | undefined;
  const close = () => {
    closing ??= app.close().catch((error: unknown) => {
      app.log.error({ err: error }, 'Shutdown failed');
      process.exitCode = 1;
    });
  };
  signals.on('SIGTERM', close); signals.on('SIGINT', close);
  return () => { signals.off('SIGTERM', close); signals.off('SIGINT', close); };
}
