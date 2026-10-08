const assert = require('node:assert/strict');
const { readFileSync, writeFileSync, appendFileSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const config = require('dotenv').parse(readFileSync('.env.docker-smoke'));
const base = `postgresql://postgres:${encodeURIComponent(config.POSTGRES_PASSWORD)}@127.0.0.1:15432/`;
const { PrismaClient } = require('../apps/identity-access-service/node_modules/.prisma/client-identity');
const admin = new PrismaClient({ datasources: { db: { url: base + 'postgres' } } });
const name = `codex_test_identity_${Date.now()}`;
let created = false;
const log = 'identity-quota-regression.log';
writeFileSync(log, `Identity regression ${new Date().toISOString()}\n`);
function run(args, env) {
  const r = spawnSync(process.execPath, args, { env, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  appendFileSync(log, (r.stdout || '') + (r.stderr || ''));
  assert.equal(r.status, 0, 'Identity regression failed; inspect log');
}
async function main() {
  try {
    await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`); created = true;
    const env = { ...process.env, DATABASE_URL: base + name, IDENTITY_DATABASE_URL: base + name, NODE_ENV: 'test',
      JWT_SECRET: 'identity-quota-test-signing-secret', INTERNAL_API_KEY: 'identity-quota-test-internal-key', BCRYPT_ROUNDS: '4' };
    run(['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', 'apps/identity-access-service/prisma/schema.prisma'], env);
    run(['node_modules/vitest/vitest.mjs', 'run', '--root', 'apps/identity-access-service', '--config', 'vitest.config.ts'], env);
    console.log('PASS: full Identity suite against a fresh migrated database');
  } finally {
    if (created) { assert.match(name, /^codex_test_identity_\d+$/); await admin.$executeRawUnsafe(`DROP DATABASE "${name}" WITH (FORCE)`); }
    await admin.$disconnect();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
