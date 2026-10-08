import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import type { FastifyInstance } from 'fastify';

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

const PORT = Number(process.env.PORT || '3007');
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) throw new Error('PORT must be an integer between 1 and 65535');

const start = async () => {
  let server: FastifyInstance | undefined;
  try {
    const { buildReceiptVaultApp } = await import('./app');
    const { attachReceiptWorker } = await import('./runtime');
    server = await buildReceiptVaultApp();

    const outboxWorker = attachReceiptWorker(server);

    await server.listen({ port: PORT, host: '0.0.0.0' });
    outboxWorker.start();
    server.log.info(`🚀 Receipt Vault Service running at http://localhost:${PORT}`);

    let shuttingDown = false;
    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
    for (const signal of signals) {
      process.once(signal, () => {
        if (shuttingDown) return;
        shuttingDown = true;
        server!.log.info(`Received ${signal}, closing Receipt Vault`);
        void server!.close().then(() => { process.exitCode = 0; }).catch(error => {
          server!.log.error({ err: error }, 'Receipt shutdown failed'); process.exitCode = 1;
        });
      });
    }
  } catch (err: unknown) {
    await server?.close();
    console.error('[Receipt-Vault-Service] Fatal startup error:', err instanceof Error ? err.message : 'Unknown startup error');
    process.exitCode = 1;
  }
};

start();
