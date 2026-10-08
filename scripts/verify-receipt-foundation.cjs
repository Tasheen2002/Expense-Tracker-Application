const { readFileSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { parse } = require('dotenv');
const { PrismaClient } = require('../apps/receipt-vault-service/node_modules/.prisma/client-receipt-vault');
const config = parse(readFileSync('.env.docker-smoke'));
const database = `codex_test_receipt_foundation_${Date.now()}`;
const base = `postgresql://postgres:${encodeURIComponent(config.POSTGRES_PASSWORD)}@127.0.0.1:15432/`;
const admin = new PrismaClient({ datasources: { db: { url: base + 'postgres' } } });
async function main() {
  await admin.$executeRawUnsafe(`CREATE DATABASE "${database}"`);
  try {
    const env = { ...process.env, DATABASE_URL: base + database, RECEIPT_TEST_DATABASE_URL: base + database };
    for (const args of [
      ['node_modules/prisma/build/index.js', 'validate', '--schema', 'apps/receipt-vault-service/prisma/schema.prisma'],
      ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', 'apps/receipt-vault-service/prisma/schema.prisma'],
      ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', 'apps/receipt-vault-service/prisma/schema.prisma'],
      ['node_modules/prisma/build/index.js', 'migrate', 'status', '--schema', 'apps/receipt-vault-service/prisma/schema.prisma'],
      ['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-schema-datasource', 'apps/receipt-vault-service/prisma/schema.prisma', '--to-schema-datamodel', 'apps/receipt-vault-service/prisma/schema.prisma', '--exit-code'],
      ['node_modules/vitest/vitest.mjs', 'run', '--root', 'apps/receipt-vault-service', '--config', 'vitest.config.ts'],
    ]) {
      const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
      if (result.status !== 0) throw new Error(`Verification failed: ${args[1]}`);
    }
  } finally {
    await admin.$executeRawUnsafe(`DROP DATABASE "${database}" WITH (FORCE)`);
    await admin.$disconnect();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
