const { readFileSync, appendFileSync, writeFileSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const log = join(process.env.BACKEND_REPORT_DIR || tmpdir(), `gateway-workflow-migrations-${Date.now()}.log`);
const config = require('dotenv').parse(readFileSync('.env.docker-smoke'));
const { PrismaClient } = require('../apps/receipt-vault-service/node_modules/.prisma/client-receipt-vault');
const base = `postgresql://postgres:${encodeURIComponent(config.POSTGRES_PASSWORD)}@127.0.0.1:15432/`;
const admin = new PrismaClient({ datasources: { db: { url: base + 'postgres' } } });
const services = { identity: 'identity-access-service', expense: 'expense-budgeting-service',
  approval: 'approval-policy-service', bank_feed: 'bank-feed-service', audit: 'audit-compliance-service',
  notification: 'notification-service', categorization: 'categorization-service', receipt: 'receipt-vault-service' };
async function main() {
  writeFileSync(log, 'Local expense-smoke migration verification\n');
  try {
    const existing = await admin.$queryRawUnsafe('SELECT datname FROM pg_database');
    for (const [suffix, service] of Object.entries(services)) {
      const database = `expense_tracker_${suffix}`;
      if (!existing.some(row => row.datname === database)) await admin.$executeRawUnsafe(`CREATE DATABASE "${database}"`);
      const schema = `apps/${service}/prisma/schema.prisma`;
      for (const args of [
        ['migrate', 'deploy', '--schema', schema],
        ['migrate', 'status', '--schema', schema],
        ['migrate', 'diff', '--from-schema-datasource', schema, '--to-schema-datamodel', schema, '--exit-code'],
      ]) {
        const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', ...args], {
          env: { ...process.env, DATABASE_URL: base + database }, encoding: 'utf8', maxBuffer: 10000000,
        });
        appendFileSync(log, `${result.stdout || ''}${result.stderr || ''}`);
        if (result.status !== 0) throw new Error(`${service} ${args[1]} failed; see ${log}`);
      }
      console.log(`${service}: migrations current, no drift`);
    }
  } finally { await admin.$disconnect(); console.log(`Migration report: ${log}`); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
