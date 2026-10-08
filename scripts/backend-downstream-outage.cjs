const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { spawnSync } = require('node:child_process');
const config = require('dotenv').parse(readFileSync('.env.docker-smoke'));
const base = `postgresql://postgres:${encodeURIComponent(config.POSTGRES_PASSWORD)}@127.0.0.1:15432/expense_tracker_`;
const { PrismaClient } = require('../apps/expense-budgeting-service/node_modules/.prisma/client-expense');
const { PrismaClient: AuditClient } = require('../apps/audit-compliance-service/node_modules/.prisma/client-audit');
const expenseDb = new PrismaClient({ datasources: { db: { url: base + 'expense' } } });
const auditDb = new AuditClient({ datasources: { db: { url: base + 'audit' } } });
let stopped = false;
const databaseOutage = process.argv.includes('--database');
const outageContainer = databaseOutage ? 'expense_smoke_postgres' : 'expense_smoke_audit';
function docker(action) {
  const r = spawnSync('docker', [action, outageContainer], { encoding: 'utf8', timeout: 45000 });
  assert.equal(r.status, 0, `Docker ${action} failed`);
}
async function post(path, body, token, status = 200) {
  const r = await fetch('http://127.0.0.1:13001' + path, { method: 'POST', signal: AbortSignal.timeout(15000),
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  const value = await r.json(); assert.equal(r.status, status, value.message);
  return value.data;
}
async function main() {
  try {
    const email = `downstream-${randomUUID()}@example.test`, password = `Outage-${randomUUID()}!`;
    await post('/api/v1/auth/register', { email, password, fullName: 'Downstream Recovery' }, undefined, 201);
    const login = await post('/api/v1/auth/login', { email, password });
    const ws = await post('/api/v1/workspaces', { name: `Outage ${randomUUID().slice(0, 8)}` }, login.token, 201);
    if (databaseOutage) {
      const prefix = `/api/v1/workspaces/${ws.workspaceId}/expenses`;
      const title = `Rejected during database outage ${randomUUID()}`;
      const body = { title, amount: 1, currency: 'USD', expenseDate: new Date().toISOString(),
        paymentMethod: 'CASH', isReimbursable: false };
      docker('stop'); stopped = true;
      const started = Date.now();
      for (let i = 0; i < 3; i++) {
        assert.equal((await fetch('http://127.0.0.1:13001/live', { signal: AbortSignal.timeout(10000) })).status, 200);
        assert.equal((await fetch('http://127.0.0.1:13001/health', { signal: AbortSignal.timeout(10000) })).status, 503);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      await post(prefix, body, login.token, 503);
      docker('start'); stopped = false;
      let ready = false;
      const deadline = Date.now() + 90000;
      while (Date.now() < deadline) {
        try { ready = (await fetch('http://127.0.0.1:13001/health', { signal: AbortSignal.timeout(10000) })).ok; }
        catch { ready = false; }
        if (ready) break;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      assert.ok(ready, 'Database recovery restores Gateway readiness');
      assert.equal(await expenseDb.expense.count({ where: { workspaceId: ws.workspaceId, title } }), 0,
        'Rejected write must not appear after database recovery');
      const recovered = await post(prefix, { ...body, title: `Accepted after database recovery ${randomUUID()}` }, login.token, 201);
      assert.equal(await expenseDb.expense.count({ where: { id: recovered.expenseId } }), 1);
      const report = join(tmpdir(), `backend-database-outage-${Date.now()}.json`);
      writeFileSync(report, JSON.stringify({ verifiedAt: new Date().toISOString(), passed: true,
        workspaceId: ws.workspaceId, durationThroughRecoveryMs: Date.now() - started,
        rejectedWriteRows: 0, recoveredExpenseId: recovered.expenseId, recoveredWriteRows: 1 }, null, 2));
      console.log('PASS: PostgreSQL outage degrades readiness, stays live, rejects writes without persistence, and reconnects with the same session');
      console.log(`Database outage report: ${report}`);
      return;
    }
    docker('stop'); stopped = true;
    const started = Date.now();
    const expense = await post(`/api/v1/workspaces/${ws.workspaceId}/expenses`, { title: 'Audit outage recovery', amount: 1,
      currency: 'USD', expenseDate: new Date().toISOString(), paymentMethod: 'CASH', isReimbursable: false }, login.token, 201);
    for (let i = 0; i < 6; i++) {
      assert.equal((await fetch('http://127.0.0.1:13001/live')).status, 200);
      assert.equal((await fetch('http://127.0.0.1:13001/health')).status, 503);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    const pending = await expenseDb.outboxEvent.findFirstOrThrow({ where: { aggregateId: expense.expenseId, eventType: 'expense.created' } });
    assert.notEqual(pending.status, 'PROCESSED');
    assert.notEqual(pending.status, 'DEAD_LETTER');
    docker('start'); stopped = false;
    const deadline = Date.now() + 90000;
    while (Date.now() < deadline) {
      const event = await expenseDb.outboxEvent.findUniqueOrThrow({ where: { id: pending.id } });
      if (event.status === 'PROCESSED') break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    assert.equal((await expenseDb.outboxEvent.findUniqueOrThrow({ where: { id: pending.id } })).status, 'PROCESSED');
    assert.equal(await auditDb.auditLog.count({ where: { id: pending.id } }), 1);
    const report = join(tmpdir(), `backend-downstream-outage-${Date.now()}.json`);
    writeFileSync(report, JSON.stringify({ verifiedAt: new Date().toISOString(), workspaceId: ws.workspaceId,
      expenseId: expense.expenseId, eventId: pending.id, durationThroughRecoveryMs: Date.now() - started,
      auditUnavailableMs: 30000, statusDuringOutage: pending.status, finalStatus: 'PROCESSED', auditRows: 1 }, null, 2));
    console.log('PASS: expense commits during 30-second Audit outage, gateway reports degraded readiness, queued event recovers exactly once');
    console.log(`Outage report: ${report}`);
  } finally {
    if (stopped) docker('start');
    await Promise.allSettled([expenseDb.$disconnect(), auditDb.$disconnect()]);
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
