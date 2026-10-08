import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { buildWebhookRoutes } from '../apps/expense-budgeting-service/src/shared/infrastructure/webhooks/webhook-routing';
const require = createRequire(resolve('package.json'));
const dotenv = require('dotenv');
const localPath = resolve('apps/expense-budgeting-service/.env');
const local = existsSync(localPath) ? dotenv.parse(readFileSync(localPath)) : {};
const url = process.env.OUTBOX_DATABASE_URL || local.DATABASE_URL || process.env.EXPENSE_DATABASE_URL;
require('./scripts/lib/outbox-recovery-policy.cjs').validateLocalDatabase(url);
const { PrismaClient } = require(resolve('apps/expense-budgeting-service/node_modules/.prisma/client-expense'));
const db = new PrismaClient({ datasources: { db: { url } } });
async function main() {
  try {
    const types: Array<{ eventType: string }> = await db.outboxEvent.groupBy({ by: ['eventType'] });
    const routes = buildWebhookRoutes({ auditServiceUrl: 'http://localhost:3009', notificationServiceUrl: 'http://localhost:3008' });
    const missing = types.filter(row => routes[row.eventType] === undefined).map(row => row.eventType);
    console.log(JSON.stringify({ storedEventTypes: types.length, unmapped: missing }));
    if (missing.length) process.exitCode = 1;
  } finally { await db.$disconnect(); }
}
main().catch(() => { console.error('Outbox compatibility verification failed'); process.exitCode = 1; });
