import { FastifyInstance } from 'fastify';
import { buildBankFeedApp, BankFeedAppOptions } from './app';
import { OutboxWorker, HttpWebhookPublisher } from '@expense-tracker/outbox-kit';

export interface ManagedWorker { start(): void | Promise<void>; stop(): Promise<void>; }
interface SignalSource {
  on(event: 'SIGTERM' | 'SIGINT', listener: () => void): unknown;
  off(event: 'SIGTERM' | 'SIGINT', listener: () => void): unknown;
}

function createWorkers(fastify: FastifyInstance): readonly ManagedWorker[] {
  const outboxEventRepository = fastify.compositionRoot.outboxEventRepository;
  const AUDIT_SERVICE_URL = process.env.AUDIT_SERVICE_URL || 'http://localhost:3009';
  const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008';

  const webhookRoutes = {
    BankConnectionCreated: [`${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`],
    BankConnectionActivated: [`${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`],
    BankConnectionDisconnected: [`${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`],
    BankConnectionExpired: [`${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`],
    BankConnectionSynced: [`${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`],
    BankConnectionError: [`${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`],
    BankConnectionTokenUpdated: [`${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`],
    BankConnectionDeleted: [`${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`],
    SyncSessionCreated: [`${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`],
    SyncSessionStarted: [`${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`],
    SyncSessionCompleted: [`${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`],
    SyncSessionPartiallyCompleted: [`${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`],
    SyncSessionFailed: [
      `${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`,
      `${NOTIFICATION_SERVICE_URL}/api/v1/event-outbox/events`,
    ],
    BankTransactionSynced: [`${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`],
    BankTransactionMatched: [`${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`],
    BankTransactionImported: [`${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`],
    BankTransactionIgnored: [`${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`],
    BankTransactionDuplicateDetected: [`${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`],
  };

  const publisher = new HttpWebhookPublisher(webhookRoutes);
  const outboxWorker = new OutboxWorker(outboxEventRepository, publisher, {
    pollIntervalMs: 5000,
  });
  return [outboxWorker];
}

export async function startBankFeedService(options: BankFeedAppOptions & {
  port?: number; host?: string; installSignalHandlers?: boolean; signalSource?: SignalSource;
  workersFactory?: (app: FastifyInstance) => readonly ManagedWorker[];
} = {}) {
  const rawPort = options.port ?? process.env.PORT ?? '3006';
  if (typeof rawPort === 'string' && !/^\d+$/.test(rawPort)) throw new Error('PORT must be an integer between 0 and 65535');
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT must be an integer between 0 and 65535');
  let workers: readonly ManagedWorker[] = [];
  const app = await buildBankFeedApp({ ...options, beforeDatabaseDisconnect: async () => {
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
    app.log.info({ address: app.server.address() }, 'bank-feed-service listening');
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
