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

import { buildCategorizationApp } from './app';
import { attachOutboxWorker, createShutdownHandler, readPort } from './runtime';

const start = async () => {
  let activeApp: Awaited<ReturnType<typeof buildCategorizationApp>> | undefined;
  try {
    const PORT = readPort(process.env.PORT);
    const fastify = await buildCategorizationApp();
    activeApp = fastify;

    const outboxWorker = attachOutboxWorker(fastify);

    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    outboxWorker.start();
    console.log(`[Categorization-Service] Running on http://localhost:${PORT}`);

    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
    const shutdown = createShutdownHandler(fastify);
    for (const signal of signals) {
      process.once(signal, () => { void shutdown(signal); });
    }
  } catch (err: unknown) {
    await activeApp?.close().catch(closeError => console.error('Startup cleanup failed:', closeError instanceof Error ? closeError.message : 'unknown error'));
    console.error('[Categorization-Service] Fatal startup error:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
};

start();
