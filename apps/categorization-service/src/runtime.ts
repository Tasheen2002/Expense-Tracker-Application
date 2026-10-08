import { FastifyInstance } from 'fastify';
import { OutboxWorker, HttpWebhookPublisher } from '@expense-tracker/outbox-kit';
import { createWebhookRoutes } from './shared/infrastructure/webhooks/webhook-routing';

export function attachOutboxWorker(app: FastifyInstance, worker = new OutboxWorker(
  app.compositionRoot.outboxEventRepository, new HttpWebhookPublisher(createWebhookRoutes()),
), cleanupIntervalMs = 24 * 60 * 60 * 1000) {
  // The worker exposes retention cleanup but does not schedule it itself.
  let cleanup: Promise<void> | undefined;
  const timer = setInterval(() => {
    if (cleanup) return;
    cleanup = worker.runCleanup()
      .then(count => { app.log.info({ count }, 'Cleaned up processed outbox events'); })
      .catch(error => { app.log.error(error, 'Outbox cleanup failed'); })
      .finally(() => { cleanup = undefined; });
  }, cleanupIntervalMs);
  timer.unref();
  app.addHook('onClose', async () => {
    clearInterval(timer);
    await worker.stop();
    await cleanup;
  });
  return worker;
}

/** One shared promise prevents overlapping shutdowns when both signals arrive. */
export function createShutdownHandler(app: FastifyInstance, exit: (code: number) => void = process.exit) {
  let shutdown: Promise<void> | undefined;
  return (signal: NodeJS.Signals): Promise<void> => {
    shutdown ??= (async () => {
      app.log.info({ signal }, 'Closing categorization-service');
      try {
        await app.close();
        exit(0);
      } catch (error) {
        app.log.error(error, 'Categorization shutdown failed');
        exit(1);
      }
    })();
    return shutdown;
  };
}

export function readPort(value: string | undefined): number {
  if (value === undefined) return 3004;
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535) {
    throw new Error('PORT must be an integer from 1 to 65535');
  }
  return Number(value);
}
