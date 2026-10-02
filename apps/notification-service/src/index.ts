import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { applyEnvironmentFallback } from './environment';

// 1. Load service-local .env first (DATABASE_URL, PORT — service-specific config)
const localEnvPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(localEnvPath)) {
  const localEnvConfig = dotenv.parse(fs.readFileSync(localEnvPath));
  applyEnvironmentFallback(localEnvConfig);
}

// 2. Load root .env as fallback for shared config (JWT_SECRET, REDIS_URL, etc.)
const rootEnvPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(rootEnvPath)) {
  const rootEnvConfig = dotenv.parse(fs.readFileSync(rootEnvPath));
  applyEnvironmentFallback(rootEnvConfig);
}

import { startNotificationService } from './runtime';

async function main() {
  try {
    const app = await startNotificationService({ installSignalHandlers: true });
    app.log.info({ address: app.server.address() }, 'Notification service listening');
  } catch (error: unknown) {
    console.error('[Notification-Service] Fatal startup error', error);
    process.exitCode = 1;
  }
}
void main();
