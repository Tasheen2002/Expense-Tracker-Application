import { FastifyInstance } from 'fastify';
import { buildNotificationApp, NotificationAppOptions } from './app';
import { verifyDatabaseReadiness } from './shared/infrastructure/persistence/database-readiness';

export async function startNotificationService(options: NotificationAppOptions & {
  port?: number; host?: string; installSignalHandlers?: boolean; signalSource?: SignalSource;
} = {}) {
  const port = options.port ?? Number(process.env.PORT ?? 3008);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT must be an integer between 0 and 65535');
  const app = await buildNotificationApp(options);
  if (options.installSignalHandlers) {
    const dispose = installShutdownHandlers(app, options.signalSource);
    app.addHook('onClose', async () => { dispose(); });
  }
  try {
    await verifyDatabaseReadiness(app.prisma);
    await app.listen({ port, host: options.host ?? '0.0.0.0' });
    app.compositionRoot.workers.outbox.start();
    app.compositionRoot.workers.email?.start();
    if (!app.compositionRoot.workers.email) app.log.warn('Email delivery paused: configure RESEND_API_KEY and NOTIFICATION_EMAIL_FROM');
    return app;
  } catch (error: unknown) {
    try { await app.close(); } catch (cleanupError: unknown) { app.log.error({ err: cleanupError }, 'Startup cleanup failed'); }
    throw error;
  }
}

interface SignalSource {
  on(event: 'SIGTERM' | 'SIGINT', listener: () => void): unknown;
  off(event: 'SIGTERM' | 'SIGINT', listener: () => void): unknown;
}
export function installShutdownHandlers(app: FastifyInstance, signals: SignalSource = process) {
  let shutdown: Promise<void> | undefined;
  const close = () => {
    shutdown ??= app.close().catch((error: unknown) => {
      app.log.error({ err: error }, 'Shutdown failed');
      process.exitCode = 1;
    });
  };
  signals.on('SIGTERM', close);
  signals.on('SIGINT', close);
  return () => {
    signals.off('SIGTERM', close);
    signals.off('SIGINT', close);
  };
}
