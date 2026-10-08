// Bounded local-only verification. Never reads or modifies a remote database.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFileSync, writeFileSync, appendFileSync } = require('node:fs');
const { resolve, join } = require('node:path');
const { tmpdir } = require('node:os');
const { spawn, spawnSync } = require('node:child_process');
const { createServer } = require('node:http');
const config = require('dotenv').parse(readFileSync('.env.docker-smoke'));
const base = `postgresql://postgres:${encodeURIComponent(config.POSTGRES_PASSWORD)}@127.0.0.1:15432/`;
const expenseClient = resolve('apps/expense-budgeting-service/node_modules/.prisma/client-expense');
const { PrismaClient } = require(expenseClient);
const { PrismaClient: AuditClient } = require('../apps/audit-compliance-service/node_modules/.prisma/client-audit');
const expense = new PrismaClient({ datasources: { db: { url: base + 'expense_tracker_expense' } } });
const audit = new AuditClient({ datasources: { db: { url: base + 'expense_tracker_audit' } } });
const admin = new PrismaClient({ datasources: { db: { url: base + 'postgres' } } });
const results = { startedAt: new Date().toISOString(), stages: [], checks: [] };
const recoveryOnly = process.argv.includes('--recovery-only');
results.recoveryOnly = recoveryOnly;
const children = new Set();
let gateway, crashDb, crashPrisma, relay, identityStopped = false;
const runId = Date.now();
const log = join(tmpdir(), `backend-load-recovery-${runId}.log`);
const report = join(tmpdir(), `backend-load-recovery-${runId}.json`);
const gatewayBundle = join(tmpdir(), `backend-load-gateway-${runId}.cjs`);
const workerBundle = join(tmpdir(), `backend-crash-worker-${runId}.cjs`);
writeFileSync(log, `Local load and recovery ${results.startedAt}\n`);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function record(label) { results.checks.push(label); console.log(`PASS: ${label}`); }
function run(args, env = process.env) {
  const r = spawnSync(args[0], args.slice(1), { env, encoding: 'utf8', timeout: 90000, maxBuffer: 10 * 1024 * 1024 });
  appendFileSync(log, (r.stdout || '') + (r.stderr || ''));
  assert.equal(r.status, 0, `Verification subprocess failed: ${args[0]}`);
  return r.stdout;
}
function child(file, extra = {}) {
  const p = spawn(process.execPath, [file], { env: { ...process.env, ...extra }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  children.add(p);
  p.on('exit', () => children.delete(p));
  p.stdout.on('data', d => appendFileSync(log, d));
  p.stderr.on('data', d => appendFileSync(log, d));
  return p;
}
async function eventually(fn, label, timeout = 75000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { if (await fn()) return; await sleep(250); }
  throw new Error(`Timeout: ${label}`);
}
async function request(path, method = 'GET', body, token) {
  const response = await fetch(gateway + path, { method, signal: AbortSignal.timeout(15000),
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined });
  const value = await response.json();
  return { status: response.status, value };
}
async function ok(path, method, body, token, status = 200) {
  const r = await request(path, method, body, token);
  assert.equal(r.status, status, `${method} ${path}: ${r.status} ${r.value.message || ''}`);
  return r.value.data;
}
async function main() {
  try {
    require('esbuild').buildSync({ entryPoints: ['scripts/backend-crash-worker.ts'], bundle: true,
      platform: 'node', target: 'node20', format: 'cjs', outfile: workerBundle });
    if (recoveryOnly) {
      gateway = 'http://127.0.0.1:13001';
    } else {
    require('esbuild').buildSync({ entryPoints: ['scripts/backend-load-gateway.ts'], bundle: true,
      platform: 'node', target: 'node20', format: 'cjs', outfile: gatewayBundle });
    const p = child(gatewayBundle);
    p.stdout.on('data', d => { const match = String(d).match(/LOAD_GATEWAY_URL=(http:\/\/[^\s]+)/); if (match) gateway = match[1]; });
    await eventually(() => gateway || p.exitCode !== null, 'load gateway startup');
    assert.ok(gateway, 'load gateway must start');
    }
    const email = `load-${randomUUID()}@example.test`, password = `Load-${randomUUID()}!`;
    await ok('/api/v1/auth/register', 'POST', { email, password, fullName: 'Local Load Verification' }, undefined, 201);
    const login = await ok('/api/v1/auth/login', 'POST', { email, password });
    const token = login.token;
    const workspace = await ok('/api/v1/workspaces', 'POST', { name: `Load ${randomUUID().slice(0, 8)}` }, token, 201);
    const workspaceId = workspace.workspaceId, prefix = `/api/v1/workspaces/${workspaceId}`;
    results.workspaceId = workspaceId;

    if (!recoveryOnly) {
    // Keep mutation counts below their deliberate module quotas.
    const location = await ok(prefix + '/locations', 'POST', { name: 'Load stock location' }, token, 201);
    const variantId = `load-${randomUUID()}`;
    const adjust = type => request(prefix + '/stock/adjust', 'POST', { variantId, locationId: location.locationId, quantity: 1, type }, token);
    const incoming = await Promise.all(Array.from({ length: 10 }, () => adjust('IN')));
    assert.ok(incoming.every(r => r.status === 200), `Concurrent stock IN: ${incoming.map(r => r.status)}`);
    const outgoing = await Promise.all(Array.from({ length: 12 }, () => adjust('OUT')));
    assert.equal(outgoing.filter(r => r.status === 200).length, 10);
    assert.ok(outgoing.filter(r => r.status !== 200).every(r => [400, 409, 422].includes(r.status)));
    const stock = await expense.stock.findUniqueOrThrow({ where: { variantId_locationId: { variantId, locationId: location.locationId } } });
    assert.equal(stock.quantity, 0);
    assert.equal(await expense.inventoryTransaction.count({ where: { variantId, locationId: location.locationId } }), 20);
    record('22 simultaneous stock operations: 20 commits, 2 insufficient-stock rejections, stock zero and ledger 20');

    console.log('Waiting for Identity quota window before allocation race and load measurement');
    await sleep(61000);
    const budget = await ok(prefix + '/budgets', 'POST', { name: 'Concurrent allocation budget', totalAmount: 100,
      currency: 'USD', periodType: 'MONTHLY', startDate: new Date().toISOString() }, token, 201);
    const allocationRace = await Promise.all(Array.from({ length: 8 }, () => request(prefix + `/budgets/${budget.budgetId}/allocations`, 'POST', { allocatedAmount: 30 }, token)));
    assert.ok(allocationRace.every(r => [201, 400, 409, 422].includes(r.status)), allocationRace.map(r => r.status).join(','));
    const allocated = await expense.budgetAllocation.findMany({ where: { budgetId: budget.budgetId } });
    const total = allocated.reduce((sum, row) => sum + Number(row.allocatedAmount), 0);
    assert.ok(total <= 100 && allocated.length > 0);
    results.allocationRace = { statuses: allocationRace.map(r => r.status), committed: allocated.length, total };
    record('concurrent budget allocations cannot exceed the budget or bypass duplicate-allocation rules');

    for (const concurrency of [1, 4, 12]) {
      console.log(`Measuring concurrency ${concurrency}; allowing Identity quota to reset first`);
      await sleep(61000);
      const samples = [], started = Date.now(), duration = 15000;
      let issued = 0;
      await Promise.all(Array.from({ length: concurrency }, async () => {
        while (Date.now() - started < duration && issued < 120) {
          const index = issued++, t = performance.now();
          try {
            const r = await request(index % 2 ? '/api/v1/auth/me' : prefix + '/expenses', 'GET', undefined, token);
            samples.push({ status: r.status, ms: performance.now() - t });
          } catch { samples.push({ status: 'timeout-or-network', ms: performance.now() - t }); }
          // Pace the bounded request budget across the whole stage.
          await sleep(Math.max(100, Math.ceil(concurrency * duration / 120) - (performance.now() - t)));
        }
      }));
      const elapsed = Date.now() - started, sorted = samples.map(s => s.ms).sort((a, b) => a - b);
      const statuses = {};
      for (const s of samples) statuses[s.status] = (statuses[s.status] || 0) + 1;
      const quantile = q => Math.round(sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * q) - 1)] * 100) / 100;
      const stage = { concurrency, requests: samples.length, durationMs: elapsed, throughput: samples.length / (elapsed / 1000),
        statuses, medianMs: quantile(.5), p95Ms: quantile(.95), p99Ms: quantile(.99) };
      results.stages.push(stage);
      console.log(JSON.stringify(stage));
    }
    }

    // Fresh isolated database: no other worker can claim this event.
    crashDb = `codex_test_crash_${Date.now()}`;
    await admin.$executeRawUnsafe(`CREATE DATABASE "${crashDb}"`);
    const databaseUrl = base + crashDb;
    run([process.execPath, 'node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', 'apps/expense-budgeting-service/prisma/schema.prisma'], { ...process.env, DATABASE_URL: databaseUrl });
    crashPrisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    const eventId = randomUUID(), aggregateId = randomUUID();
    await crashPrisma.outboxEvent.create({ data: { id: eventId, aggregateId, aggregateType: 'Expense', eventType: 'expense.created',
      status: 'PENDING', payload: { workspaceId, createdBy: login.user.userId, title: 'Worker crash verification', amount: 1, currency: 'USD' } } });
    let deliveries = 0, committed = false;
    relay = createServer(async (req, res) => {
      try {
        let body = ''; for await (const chunk of req) body += chunk;
        deliveries++;
        const upstream = await fetch('http://127.0.0.1:13009/api/v1/event-outbox/events', { method: 'POST',
          headers: { 'content-type': 'application/json', 'x-internal-api-key': config.INTERNAL_API_KEY }, body });
        const payload = await upstream.text();
        assert.ok([200, 201].includes(upstream.status), `Audit relay ${upstream.status}`);
        if (deliveries === 1) { committed = true; return; } // deliberately withhold the first acknowledgement
        res.writeHead(upstream.status, { 'content-type': 'application/json' }); res.end(payload);
      } catch (error) { res.writeHead(500); res.end(JSON.stringify({ error: error.message })); }
    });
    await new Promise(resolve => relay.listen(0, '127.0.0.1', resolve));
    const workerEnv = { DATABASE_URL: databaseUrl, PRISMA_CLIENT_PATH: expenseClient,
      INTERNAL_API_KEY: config.INTERNAL_API_KEY, CRASH_SUBSCRIBER_URL: `http://127.0.0.1:${relay.address().port}/events` };
    const first = child(workerBundle, workerEnv);
    await eventually(() => committed || first.exitCode !== null, 'receiver committed before acknowledgement');
    assert.ok(committed, 'receiver must commit');
    first.kill('SIGKILL');
    await new Promise(resolve => first.once('exit', resolve));
    const abandoned = await crashPrisma.outboxEvent.findUniqueOrThrow({ where: { id: eventId } });
    assert.equal(abandoned.status, 'PROCESSING'); assert.deepEqual(abandoned.deliveredTo, []);
    assert.equal(await audit.auditLog.count({ where: { id: eventId } }), 1);
    console.log('Worker terminated after Audit commit but before acknowledgement; waiting for real 60-second lease recovery');
    const second = child(workerBundle, workerEnv);
    await eventually(async () => (await crashPrisma.outboxEvent.findUniqueOrThrow({ where: { id: eventId } })).status === 'PROCESSED', 'lease recovery and replay', 80000);
    assert.equal(deliveries, 2);
    assert.equal(await audit.auditLog.count({ where: { id: eventId } }), 1);
    results.crashRecovery = { eventId, deliveries, auditRows: 1, leaseDurationMs: 60000, finalStatus: 'PROCESSED' };
    record('real worker process crash after receiver commit: expired lease reclaimed, replay delivered, Audit remains one row');
    second.kill('SIGKILL');

    run(['docker', 'stop', '--time', '10', 'expense_smoke_identity']); identityStopped = true;
    const outageStart = Date.now(), outageStatuses = [];
    for (let i = 0; i < 6; i++) {
      outageStatuses.push((await request(prefix + '/expenses', 'GET', undefined, token)).status);
      assert.equal((await fetch(gateway + '/live')).status, 200);
      await sleep(5000);
    }
    assert.ok(outageStatuses.every(s => s === 503));
    run(['docker', 'start', 'expense_smoke_identity']); identityStopped = false;
    await eventually(async () => { try { return (await request(prefix + '/expenses', 'GET', undefined, token)).status === 200; } catch { return false; } }, 'Identity recovery');
    results.identityOutage = { durationMs: Date.now() - outageStart, deniedRequests: outageStatuses.length, statuses: outageStatuses };
    record('30-second Identity outage fails closed, gateway stays live, same session works after recovery');
    results.dockerStats = run(['docker', 'stats', '--no-stream', '--format', '{{.Name}} {{.CPUPerc}} {{.MemUsage}}']);
    results.passed = true;
  } finally {
    if (identityStopped) run(['docker', 'start', 'expense_smoke_identity']);
    for (const p of children) p.kill('SIGKILL');
    if (relay) { relay.closeAllConnections(); await new Promise(resolve => relay.close(resolve)); }
    await Promise.allSettled([expense.$disconnect(), audit.$disconnect(), crashPrisma?.$disconnect()]);
    if (crashDb) {
      assert.match(crashDb, /^codex_test_crash_\d+$/);
      await admin.$executeRawUnsafe(`DROP DATABASE "${crashDb}" WITH (FORCE)`);
    }
    await admin.$disconnect();
    results.finishedAt = new Date().toISOString();
    writeFileSync(report, JSON.stringify(results, null, 2));
    console.log(`Recovery report: ${report}; log: ${log}`);
  }
}
main().catch(error => {
  results.failure = error.message;
  results.passed = false;
  writeFileSync(report, JSON.stringify(results, null, 2));
  console.error(error.message); process.exitCode = 1;
});
