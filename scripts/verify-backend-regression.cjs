// Run all backend suites against newly created databases; never reset application data.
const { readFileSync, writeFileSync, appendFileSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { parse } = require('dotenv');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { PrismaClient } = require('../apps/receipt-vault-service/node_modules/.prisma/client-receipt-vault');
const config = parse(readFileSync('.env.docker-smoke'));
const base = `postgresql://postgres:${encodeURIComponent(config.POSTGRES_PASSWORD)}@127.0.0.1:15432/`;
const admin = new PrismaClient({ datasources: { db: { url: base + 'postgres' } } });
const runId = Date.now();
const created = [];
const results = [];
const coverage = process.env.BACKEND_VERIFY_COVERAGE === 'true';
const selected = new Set((process.env.BACKEND_VERIFY_SERVICES || '').split(',').filter(Boolean));
const allowed = new Set(['identity-access-service', 'approval-policy-service', 'expense-budgeting-service',
  'audit-compliance-service', 'bank-feed-service', 'notification-service', 'categorization-service',
  'receipt-vault-service', 'gateway', 'shared-packages']);
if ([...selected].some(service => !allowed.has(service))) throw new Error('Unknown BACKEND_VERIFY_SERVICES selection');
const log = join(tmpdir(), `expense-backend-regression-${runId}.log`);
writeFileSync(log, `Backend verification ${new Date().toISOString()}\n`);
function run(label, args, env) {
  const result = spawnSync(process.execPath, args, { env, encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 });
  appendFileSync(log, `\n${label}\n${result.stdout || ''}${result.stderr || ''}`);
  appendFileSync(log, `\nProcess result: ${JSON.stringify({ status: result.status, signal: result.signal, error: result.error?.code })}\n`);
  console.log(`${label}: ${result.status === 0 ? 'PASS' : 'FAIL'}`);
  return result.status === 0;
}
async function database(suffix, service) {
  const name = `codex_test_${suffix}_${runId}`;
  await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
  created.push(name);
  const url = base + name;
  const schema = `apps/${service}/prisma/schema.prisma`;
  const env = { ...process.env, DATABASE_URL: url };
  for (const [label, args] of [
    ['validate', ['validate', '--schema', schema]],
    ['migrate', ['migrate', 'deploy', '--schema', schema]],
    ['status', ['migrate', 'status', '--schema', schema]],
    ['drift', ['migrate', 'diff', '--from-schema-datasource', schema, '--to-schema-datamodel', schema, '--exit-code']],
  ]) {
    if (!run(`${suffix} ${label}`, ['node_modules/prisma/build/index.js', ...args], env)) throw new Error(`${suffix} ${label} failed`);
  }
  return url;
}
async function main() {
  try {
    const expenseE2e = await database('expense_e2e_fixture', 'expense-budgeting-service');
    const bankOutbox = await database('bank_outbox', 'bank-feed-service');
    for (const [service, variable] of [
      ['identity-access-service', 'IDENTITY_DATABASE_URL'],
      ['approval-policy-service', 'APPROVAL_DATABASE_URL'],
      ['expense-budgeting-service', 'CATEGORY_DELIVERY_TEST_DATABASE_URL'],
      ['audit-compliance-service', 'AUDIT_DATABASE_URL'],
      ['bank-feed-service', 'BANK_FEED_TEST_DATABASE_URL'],
      ['notification-service', 'NOTIFICATION_TEST_DATABASE_URL'],
      ['categorization-service', 'CATEGORIZATION_TEST_DATABASE_URL'],
      ['receipt-vault-service', 'RECEIPT_TEST_DATABASE_URL'],
    ]) {
      if (selected.size && !selected.has(service)) continue;
      const url = await database(service.split('-')[0], service);
      const env = {
        ...process.env, DATABASE_URL: url, [variable]: url, NODE_ENV: 'test',
        EXPENSE_E2E_DATABASE_URL: expenseE2e, BANK_FEED_OUTBOX_TEST_DATABASE_URL: bankOutbox,
        JWT_SECRET: 'isolated-regression-secret-for-tests-only', INTERNAL_API_KEY: 'isolated-regression-internal-key-for-tests',
        RESEND_API_KEY: '', NOTIFICATION_EMAIL_FROM: '', MAILPIT_TEST_URL: '', BCRYPT_ROUNDS: '4',
      };
      const coverageArgs = coverage ? ['--coverage', '--coverage.reportsDirectory', join(tmpdir(), `expense-coverage-${runId}`, service)] : [];
      const passed = run(service, ['node_modules/vitest/vitest.mjs', 'run', '--root', `apps/${service}`, '--config', 'vitest.config.ts', ...coverageArgs], env);
      results.push({ service, passed });
    }
    for (const [service, args] of [
      ['gateway', ['node_modules/vitest/vitest.mjs', 'run', '--root', 'apps/gateway', '--config', 'vitest.config.ts']],
      ['shared-packages', ['node_modules/vitest/vitest.mjs', 'run', '--config', 'packages/vitest.config.ts']],
    ]) {
      if (selected.size && !selected.has(service)) continue;
      const coverageArgs = coverage ? ['--coverage', '--coverage.reportsDirectory', join(tmpdir(), `expense-coverage-${runId}`, service)] : [];
      results.push({ service, passed: run(service, [...args, ...coverageArgs], { ...process.env, RESEND_API_KEY: '', NOTIFICATION_EMAIL_FROM: '' }) });
    }
  } finally {
    for (const name of created.reverse()) {
      if (!/^codex_test_[a-z0-9_]+_[0-9]+$/.test(name) || !name.endsWith(`_${runId}`)) throw new Error('Unsafe cleanup target');
      await admin.$executeRawUnsafe(`DROP DATABASE "${name}" WITH (FORCE)`);
    }
    await admin.$disconnect();
    const report = join(tmpdir(), `expense-backend-regression-${runId}.json`);
    writeFileSync(report, JSON.stringify(results, null, 2));
    console.log(`Results: ${report}\nDetails: ${log}`);
  }
  if (results.some(result => !result.passed)) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
