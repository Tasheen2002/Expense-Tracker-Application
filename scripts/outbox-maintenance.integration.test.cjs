const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { randomUUID } = require('node:crypto');
const { readFileSync, existsSync } = require('node:fs');
const { spawn, spawnSync } = require('node:child_process');
const { PrismaClient } = require('../apps/expense-budgeting-service/node_modules/.prisma/client-expense');

test('guarded recovery: PostgreSQL leases, ownership refusal, failure retention and idempotent rerun', {
  skip: !existsSync('.env.docker-smoke'), timeout: 120000,
}, async () => {
  const config = require('dotenv').parse(readFileSync('.env.docker-smoke'));
  const base = `postgresql://postgres:${encodeURIComponent(config.POSTGRES_PASSWORD)}@127.0.0.1:15432/`;
  const name = `expense_tracker_recovery_test_${Date.now()}`;
  assert.match(name, /^expense_tracker_recovery_test_[0-9]+$/);
  const admin = new PrismaClient({ datasources: { db: { url: base + 'postgres' } } });
  const db = new PrismaClient({ datasources: { db: { url: base + name } } });
  const received = []; let failNext = true; let created = false;
  const failedId = randomUUID();
  const receiver = createServer(async (request, response) => {
    const chunks = []; for await (const chunk of request) chunks.push(chunk);
    const event = JSON.parse(Buffer.concat(chunks).toString());
    received.push(event);
    response.writeHead(event.eventId === failedId && failNext ? 503 : 201, { 'content-type': 'application/json' });
    response.end('{}');
  });
  const run = env => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/outbox-maintenance.cjs', 'replay', '--service', 'expense-budgeting', '--limit', '50'],
      { env, windowsHide: true });
    let output = ''; child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; }); child.on('error', reject);
    child.on('close', code => resolve({ code, output }));
  });
  try {
    await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`); created = true;
    const migration = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy',
      '--schema', 'apps/expense-budgeting-service/prisma/schema.prisma'],
    { env: { ...process.env, DATABASE_URL: base + name }, encoding: 'utf8', timeout: 60000 });
    assert.equal(migration.status, 0, 'Isolated recovery fixture migration failed');
    const workspaceId = randomUUID();
    const plan = await db.budgetPlan.create({ data: { workspaceId, name: 'Recovery fixture', periodType: 'MONTHLY',
      startDate: new Date('2026-01-01'), endDate: new Date('2026-01-31'), createdBy: randomUUID() } });
    const goodId = randomUUID(), orphanId = randomUUID(), conflictId = randomUUID();
    for (const [id, aggregateId, workspace] of [[goodId, plan.id, undefined], [orphanId, randomUUID(), undefined],
      [conflictId, plan.id, randomUUID()], [failedId, plan.id, workspaceId]]) {
      await db.outboxEvent.create({ data: { id, aggregateType: 'BudgetPlan', aggregateId, eventType: 'BudgetPlanUpdated',
        status: 'DEAD_LETTER', retryCount: 5, error: 'Unmapped event type',
        payload: { planId: aggregateId, ...(workspace ? { workspaceId: workspace } : {}) } } });
    }
    await new Promise(resolve => receiver.listen(0, '127.0.0.1', resolve));
    const env = { ...process.env, OUTBOX_DATABASE_URL: base + name,
      AUDIT_SERVICE_URL: `http://127.0.0.1:${receiver.address().port}`, INTERNAL_API_KEY: 'recovery-test-key' };
    assert.equal((await run(env)).code, 1, 'Failed delivery must return a nonzero status');
    assert.equal((await db.outboxEvent.findUniqueOrThrow({ where: { id: goodId } })).status, 'PROCESSED');
    assert.equal(received.find(event => event.eventId === goodId).payload.workspaceId, workspaceId);
    for (const id of [orphanId, conflictId, failedId]) {
      const row = await db.outboxEvent.findUniqueOrThrow({ where: { id } });
      assert.equal(row.status, 'DEAD_LETTER'); assert.equal(row.leaseToken, null);
    }
    assert.ok(!received.some(event => [orphanId, conflictId].includes(event.eventId)));
    failNext = false;
    assert.equal((await run(env)).code, 0);
    assert.equal((await db.outboxEvent.findUniqueOrThrow({ where: { id: failedId } })).status, 'PROCESSED');
    assert.equal((await run(env)).code, 0);
    assert.equal(received.filter(event => event.eventId === goodId).length, 1);
    assert.equal(received.filter(event => event.eventId === failedId).length, 2);
  } finally {
    await new Promise(resolve => receiver.close(resolve)); await db.$disconnect();
    if (created) await admin.$executeRawUnsafe(`DROP DATABASE "${name}" WITH (FORCE)`);
    await admin.$disconnect();
  }
});
