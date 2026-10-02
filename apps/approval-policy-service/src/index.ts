import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { applyEnvironmentFallback } from './environment';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function main() {
  try {
    const { startApprovalService } = await import('./runtime');
    await startApprovalService({ installSignalHandlers: true });
  } catch (error: unknown) {
    console.error('[approval-policy-service] Fatal startup error:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
void main();
