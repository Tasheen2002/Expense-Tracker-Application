// Local verification entry point. Production gateway quotas remain enabled.
import { buildGatewayApp } from '../apps/gateway/src/app';
import { readFileSync } from 'node:fs';
import { parse } from 'dotenv';

async function main() {
  const config = parse(readFileSync('.env.docker-smoke'));
  process.env.NODE_ENV = 'production';
  const app = await buildGatewayApp({
    jwtSecret: config.JWT_SECRET, internalApiKey: config.INTERNAL_API_KEY,
    frontendUrl: 'http://localhost:3000', enableRateLimit: false,
    services: {
      identity: 'http://127.0.0.1:13002', expense: 'http://127.0.0.1:13003',
      categorization: 'http://127.0.0.1:13004', approval: 'http://127.0.0.1:13005',
      bankFeed: 'http://127.0.0.1:13006', receipt: 'http://127.0.0.1:13007',
      notification: 'http://127.0.0.1:13008', audit: 'http://127.0.0.1:13009',
    },
  });
  const url = await app.listen({ host: '127.0.0.1', port: 0 });
  console.log(`LOAD_GATEWAY_URL=${url}`);
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => { void app.close().then(() => process.exit()); });
  }
}
void main().catch(() => { console.error('Local load gateway startup failed'); process.exitCode = 1; });
