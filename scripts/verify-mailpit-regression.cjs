const { readFileSync, writeFileSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const config = require('dotenv').parse(readFileSync('.env.docker-smoke'));
const { PrismaClient } = require('../apps/receipt-vault-service/node_modules/.prisma/client-receipt-vault');
const base = `postgresql://postgres:${encodeURIComponent(config.POSTGRES_PASSWORD)}@127.0.0.1:15432/`;
const admin = new PrismaClient({ datasources: { db: { url: base + 'postgres' } } });
const database = `codex_test_notification_mailpit_${Date.now()}`;
const logPath = join(tmpdir(), `${database}.log`);
async function main() {
  await admin.$executeRawUnsafe(`CREATE DATABASE "${database}"`);
  try {
    const env = { ...process.env, DATABASE_URL: base + database, NOTIFICATION_TEST_DATABASE_URL: base + database,
      MAILPIT_TEST_URL: 'http://127.0.0.1:8025', RESEND_API_KEY: '', NOTIFICATION_EMAIL_FROM: '', NODE_ENV: 'test' };
    const commands = [
      ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', 'apps/notification-service/prisma/schema.prisma'],
      ['node_modules/vitest/vitest.mjs', 'run', '--root', 'apps/notification-service', '--config', 'vitest.config.ts',
        'src/modules/notification-dispatch/tests/mailpit-delivery.integration.test.ts'],
    ];
    let log = '';
    for (const args of commands) {
      const result = spawnSync(process.execPath, args, { env, encoding: 'utf8', maxBuffer: 10000000 });
      log += `${result.stdout || ''}${result.stderr || ''}`;
      writeFileSync(logPath, log);
      console.log(`${args[1]}: ${result.status === 0 ? 'PASS' : 'FAIL'}`);
      if (result.status !== 0) throw new Error('Mailpit verification failed');
    }
  } finally {
    await admin.$executeRawUnsafe(`DROP DATABASE "${database}" WITH (FORCE)`);
    await admin.$disconnect();
    console.log(`Details: ${logPath}`);
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
