import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import type { FastifyInstance } from 'fastify';

// 1. Load service-local .env first (PORT — service-specific config)
const localEnvPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(localEnvPath)) {
  const localEnvConfig = dotenv.parse(fs.readFileSync(localEnvPath));
  for (const k in localEnvConfig) {
    if (!process.env[k]) {
      process.env[k] = localEnvConfig[k];
    }
  }
}

// 2. Load root .env as fallback for shared config (JWT_SECRET, service URLs, etc.)
const rootEnvPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(rootEnvPath)) {
  const rootEnvConfig = dotenv.parse(fs.readFileSync(rootEnvPath));
  for (const k in rootEnvConfig) {
    if (!process.env[k]) {
      process.env[k] = rootEnvConfig[k];
    }
  }
}

const PORT = Number(process.env.PORT || '3001');
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535)
  throw new Error('PORT must be an integer between 1 and 65535');

const start = async () => {
  let fastify: FastifyInstance | undefined;
  try {
    const { buildGatewayApp } = await import('./app');
    fastify = await buildGatewayApp();

    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`[API-Gateway] Running on http://localhost:${PORT}`);

    let shuttingDown = false;
    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
    for (const signal of signals) {
      process.once(signal, () => {
        if (shuttingDown) return;
        shuttingDown = true;
        fastify!.log.info({ signal }, 'Gateway shutting down');
        void fastify!
          .close()
          .then(() => {
            process.exitCode = 0;
          })
          .catch((error) => {
            fastify!.log.error({ err: error }, 'Gateway shutdown failed');
            process.exitCode = 1;
          });
      });
    }
  } catch (error: unknown) {
    await fastify?.close();
    console.error(
      '[API-Gateway] Fatal startup error:',
      error instanceof Error ? error.message : 'Unknown startup error'
    );
    process.exitCode = 1;
  }
};

start();
