import { FastifyInstance } from 'fastify';
import { buildAuditComplianceApp, AuditAppOptions } from './app';

interface SignalSource {
  on(event: 'SIGTERM' | 'SIGINT', listener: () => void): unknown;
  off(event: 'SIGTERM' | 'SIGINT', listener: () => void): unknown;
}

export async function startAuditService(options: AuditAppOptions & {
  port?: number; host?: string; installSignalHandlers?: boolean; signalSource?: SignalSource;
} = {}) {
  const rawPort = options.port ?? process.env.PORT ?? '3009';
  if (typeof rawPort === 'string' && !/^\d+$/.test(rawPort)) throw new Error('PORT must be an integer between 0 and 65535');
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT must be an integer between 0 and 65535');
  const app = await buildAuditComplianceApp(options);
  try {
    if (options.installSignalHandlers) {
      const dispose = installShutdownHandlers(app, options.signalSource);
      app.addHook('onClose', async () => { dispose(); });
    }
    const health = await app.inject('/health');
    if (health.statusCode !== 200) throw new Error('Database schema is not ready');
    await app.listen({ port, host: options.host ?? '0.0.0.0' });
    app.log.info({ address: app.server.address() }, 'audit-compliance-service listening');
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
