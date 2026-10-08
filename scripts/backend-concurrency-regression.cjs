const assert = require('node:assert/strict');
const { readFileSync, writeFileSync, appendFileSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const config = require('dotenv').parse(readFileSync('.env.docker-smoke'));
const base = `postgresql://postgres:${encodeURIComponent(config.POSTGRES_PASSWORD)}@127.0.0.1:15432/`;
const { PrismaClient } = require('../apps/expense-budgeting-service/node_modules/.prisma/client-expense');
const admin = new PrismaClient({ datasources: { db: { url: base + 'postgres' } } });
const name = `codex_test_concurrency_${Date.now()}`;
const log = 'backend-concurrency-regression.log';
writeFileSync(log, `Concurrency regression ${new Date().toISOString()}\n`);
let created = false;
function run(args, env) {
  const result = spawnSync(process.execPath, args, { env, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  appendFileSync(log, (result.stdout || '') + (result.stderr || ''));
  assert.equal(result.status, 0, 'Concurrency verification subprocess failed; inspect log');
}
async function main() {
  try {
    await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`); created = true;
    const env = { ...process.env, DATABASE_URL: base + name, NODE_ENV: 'test', RESEND_API_KEY: '', NOTIFICATION_EMAIL_FROM: '',
      JWT_SECRET: 'local-concurrency-test-secret-only', INTERNAL_API_KEY: 'local-concurrency-test-internal-only' };
    run(['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', 'apps/expense-budgeting-service/prisma/schema.prisma'], env);
    run(['node_modules/vitest/vitest.mjs', 'run', '--root', 'apps/expense-budgeting-service', '--config', 'vitest.config.ts',
      'budget-concurrency.integration.test.ts', 'inventory-write-concurrency.integration.test.ts',
      'outbox-concurrency.integration.test.ts', 'optimistic-concurrency.integration.test.ts',
      'settlement-concurrency.integration.test.ts', 'recurring-concurrency.integration.test.ts',
      'budget-plan-concurrency.integration.test.ts', 'budget-outbox-atomicity.integration.test.ts'], env);
    console.log('PASS: focused PostgreSQL concurrency and rollback suites');
  } finally {
    if (created) { assert.match(name, /^codex_test_concurrency_\d+$/); await admin.$executeRawUnsafe(`DROP DATABASE "${name}" WITH (FORCE)`); }
    await admin.$disconnect();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
