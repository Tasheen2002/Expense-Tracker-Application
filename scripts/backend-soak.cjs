// Bounded verification against the local smoke stack. Never prints credentials.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const exec = promisify(execFile);
const config = require('dotenv').parse(readFileSync('.env.docker-smoke'));
const base = `postgresql://postgres:${encodeURIComponent(config.POSTGRES_PASSWORD)}@127.0.0.1:15432/expense_tracker_`;
const clients = {};
for (const [name, service, generated] of [
  ['identity', 'identity-access', 'identity'],
  ['expense', 'expense-budgeting', 'expense'],
  ['audit', 'audit-compliance', 'audit'],
  ['notification', 'notification', 'notification'],
]) {
  const { PrismaClient } = require(
    `../apps/${service}-service/node_modules/.prisma/client-${generated}`
  );
  clients[name] = new PrismaClient({
    datasources: { db: { url: base + name } },
  });
}
const gateway = 'http://127.0.0.1:13001';
const file = 'backend-soak-results.json';
const results = {
  startedAt: new Date().toISOString(),
  gateway,
  durationSeconds: 600,
  userCount: 10,
  intervalMs: 5000,
  quotasDisabled: false,
  actors: [],
  samples: [],
  telemetry: [],
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const persist = () => writeFileSync(file, JSON.stringify(results, null, 2));
const ids = [];
async function request(path, token, body) {
  const t = performance.now();
  try {
    const r = await fetch(gateway + path, {
      method: body === undefined ? 'GET' : 'POST',
      signal: AbortSignal.timeout(10000),
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const value = await r.json();
    return {
      status: r.status,
      ms: performance.now() - t,
      value,
      quotaLimit: r.headers.get('x-ratelimit-limit'),
      remaining: r.headers.get('x-ratelimit-remaining'),
    };
  } catch (error) {
    return {
      status: 'network-or-timeout',
      ms: performance.now() - t,
      error: error.name,
    };
  }
}
async function expected(path, token, body, status) {
  const r = await request(path, token, body);
  assert.equal(
    r.status,
    status,
    `Setup ${path}: expected ${status}, received ${r.status}`
  );
  return r.value.data;
}
async function snapshot(stage) {
  const row = { at: new Date().toISOString(), stage };
  try {
    const { stdout } = await exec(
      'docker',
      ['stats', '--no-stream', '--format', '{{json .}}'],
      { timeout: 15000, maxBuffer: 1024 * 1024 }
    );
    row.containers = stdout
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .filter((c) => c.Name.startsWith('expense_smoke_'))
      .map((c) => ({
        name: c.Name,
        cpu: c.CPUPerc,
        memory: c.MemUsage,
        memoryPercent: c.MemPerc,
        pids: c.PIDs,
      }));
    row.connections = await clients.identity.$queryRawUnsafe(
      "SELECT datname, state, count(*)::int AS count FROM pg_stat_activity WHERE backend_type = 'client backend' GROUP BY datname, state ORDER BY datname, state"
    );
    row.maxConnections = await clients.identity.$queryRawUnsafe(
      'SHOW max_connections'
    );
    row.outbox = {};
    for (const name of ['identity', 'expense', 'notification']) {
      row.outbox[name] = {
        all: await clients[name].outboxEvent.groupBy({
          by: ['status'],
          _count: { _all: true },
        }),
        test: await clients[name].outboxEvent.groupBy({
          by: ['status'],
          where: { aggregateId: { in: ids } },
          _count: { _all: true },
        }),
      };
    }
  } catch (error) {
    row.error = error.name;
  }
  results.telemetry.push(row);
  persist();
}
function summarize() {
  const times = results.samples.map((s) => s.ms).sort((a, b) => a - b);
  const quantile = (q) =>
    times.length
      ? Math.round(times[Math.ceil(times.length * q) - 1] * 100) / 100
      : null;
  const statuses = {};
  for (const s of results.samples)
    statuses[s.status] = (statuses[s.status] || 0) + 1;
  return {
    requests: times.length,
    statuses,
    medianMs: quantile(0.5),
    p95Ms: quantile(0.95),
    p99Ms: quantile(0.99),
    maxMs: times.length
      ? Math.round(times[times.length - 1] * 100) / 100
      : null,
    byRoute: Object.fromEntries(
      [...new Set(results.samples.map((s) => s.route))].map((route) => {
        const samples = results.samples.filter((s) => s.route === route),
          statuses = {};
        for (const s of samples)
          statuses[s.status] = (statuses[s.status] || 0) + 1;
        return [route, { requests: samples.length, statuses }];
      })
    ),
  };
}
async function main() {
  let monitor;
  let monitoring = false;
  try {
    await expected('/health', undefined, undefined, 200);
    await snapshot('baseline');
    const actors = [];
    console.log(
      'Preparing ten synthetic users/workspaces and one expense each through the real Gateway'
    );
    for (let i = 0; i < 10; i++) {
      const email = `soak-${randomUUID()}@example.test`,
        password = `Soak-${randomUUID()}!`;
      await expected(
        '/api/v1/auth/register',
        undefined,
        { email, password, fullName: `Local Soak ${i}` },
        201
      );
      const login = await expected(
        '/api/v1/auth/login',
        undefined,
        { email, password },
        200
      );
      const workspace = await expected(
        '/api/v1/workspaces',
        login.token,
        { name: `Soak ${randomUUID().slice(0, 8)}` },
        201
      );
      const expense = await expected(
        `/api/v1/workspaces/${workspace.workspaceId}/expenses`,
        login.token,
        {
          title: `Soak expense ${i}`,
          amount: 12.34,
          currency: 'USD',
          expenseDate: new Date().toISOString(),
          paymentMethod: 'CASH',
          isReimbursable: false,
        },
        201
      );
      actors.push({
        token: login.token,
        userId: login.user.userId,
        workspaceId: workspace.workspaceId,
      });
      const accountEvent = await clients.identity.outboxEvent.findFirstOrThrow({
        where: {
          aggregateId: login.user.userId,
          eventType: 'UserCreated',
        },
      });
      results.actors.push({
        userId: login.user.userId,
        workspaceId: workspace.workspaceId,
        expenseId: expense.expenseId,
        accountEventId: accountEvent.id,
      });
      assert.ok(
        expense.expenseId,
        'Expense ID is required for delivery verification'
      );
      ids.push(
        login.user.userId,
        workspace.workspaceId,
        expense.expenseId,
        accountEvent.id
      );
    }
    await snapshot('after-setup');
    results.loadStartedAt = new Date().toISOString();
    persist();
    console.log(
      'Starting ten-minute soak: 1,200 scheduled reads across twelve route families; quotas enabled'
    );
    monitor = setInterval(() => {
      if (monitoring) return;
      monitoring = true;
      snapshot('during-load').finally(() => {
        monitoring = false;
      });
    }, 30000);
    const started = performance.now();
    const routes = [
      'auth/me',
      'expenses',
      'budgets',
      'approval-chains',
      'rules',
      'receipts',
      'bank-feed-sync/connections',
      'notifications',
      'audit-logs',
      'account/notifications',
      'account/audit-logs',
      'account/notification-preferences',
    ];
    await Promise.all(
      actors.map(async (actor, actorIndex) => {
        for (let i = 0; i < 120; i++) {
          await sleep(
            Math.max(
              0,
              started + i * 5000 + actorIndex * 500 - performance.now()
            )
          );
          const route = routes[(i + actorIndex) % routes.length];
          const path =
            route === 'auth/me' || route.startsWith('account/')
              ? `/api/v1/${route}`
              : `/api/v1/workspaces/${actor.workspaceId}/${route}`;
          const r = await request(path, actor.token);
          results.samples.push({
            userId: actor.userId,
            route,
            status: r.status,
            ms: Math.round(r.ms * 100) / 100,
            elapsedMs: Math.round(performance.now() - started),
            quotaLimit: r.quotaLimit,
            remaining: r.remaining,
          });
          if (results.samples.length % 120 === 0) {
            results.summary = summarize();
            persist();
            console.log(
              `Progress ${results.samples.length}/1200: ${JSON.stringify(results.summary.statuses)}`
            );
          }
        }
      })
    );
    await sleep(Math.max(0, started + 600000 - performance.now()));
    clearInterval(monitor);
    monitor = undefined;
    while (monitoring) await sleep(100);
    results.loadDurationMs = Math.round(performance.now() - started);
    results.summary = summarize();
    const deadline = Date.now() + 90000;
    let pending, retryable;
    do {
      pending = 0;
      retryable = 0;
      for (const name of ['identity', 'expense', 'notification']) {
        pending += await clients[name].outboxEvent.count({
          where: { aggregateId: { in: ids }, status: { not: 'PROCESSED' } },
        });
        retryable += await clients[name].outboxEvent.count({
          where: {
            aggregateId: { in: ids },
            status: { in: ['PENDING', 'PROCESSING', 'FAILED'] },
          },
        });
      }
      if (retryable) await sleep(1000);
    } while (retryable && Date.now() < deadline);
    results.nonProcessedTestEvents = pending;
    results.testEventOutcomes = {};
    for (const name of ['identity', 'expense', 'notification'])
      results.testEventOutcomes[name] = await clients[name].outboxEvent.groupBy(
        {
          by: ['eventType', 'status'],
          where: { aggregateId: { in: ids } },
          _count: { _all: true },
        }
      );
    results.expenseDeliveries = [];
    results.accountDeliveries = [];
    for (const actor of results.actors) {
      const events = await clients.expense.outboxEvent.findMany({
        where: { aggregateId: actor.expenseId, eventType: 'expense.created' },
        select: { id: true, status: true, deliveredTo: true },
      });
      assert.equal(
        events.length,
        1,
        'Exactly one expense.created event per seed expense'
      );
      results.expenseDeliveries.push({
        expenseId: actor.expenseId,
        eventId: events[0].id,
        status: events[0].status,
        auditRows: await clients.audit.auditLog.count({
          where: { id: events[0].id },
        }),
      });
      const accountNotificationEvents =
        await clients.notification.outboxEvent.findMany({
          where: {
            aggregateId: actor.accountEventId,
            eventType: 'account.notification.created',
          },
          select: { id: true, status: true },
        });
      assert.equal(accountNotificationEvents.length, 1);
      results.accountDeliveries.push({
        eventId: actor.accountEventId,
        accountAuditRows: await clients.audit.accountAuditLog.count({
          where: { id: actor.accountEventId, userId: actor.userId },
        }),
        notifications: await clients.notification.accountNotification.count({
          where: { id: actor.accountEventId, userId: actor.userId },
        }),
        notificationAuditRows: await clients.audit.accountAuditLog.count({
          where: { id: accountNotificationEvents[0].id, userId: actor.userId },
        }),
        notificationEventStatus: accountNotificationEvents[0].status,
      });
    }
    await snapshot('after-drain');
    assert.equal(results.samples.length, 1200);
    assert.equal(
      results.summary.statuses['200'],
      1200,
      'Every scheduled read must succeed'
    );
    assert.equal(pending, 0, 'Test outbox events must drain');
    assert.ok(
      results.expenseDeliveries.every(
        (e) => e.status === 'PROCESSED' && e.auditRows === 1
      ),
      'Exactly-once Audit effects'
    );
    assert.ok(
      results.accountDeliveries.every(
        (e) =>
          e.accountAuditRows === 1 &&
          e.notifications === 1 &&
          e.notificationAuditRows === 1 &&
          e.notificationEventStatus === 'PROCESSED'
      ),
      'Account event delivery and Audit effects'
    );
    assert.ok(
      results.telemetry.every((t) => !t.error),
      'Telemetry collection must succeed'
    );
    assert.ok(
      results.summary.p95Ms < 500 && results.summary.p99Ms < 1000,
      'Latency targets'
    );
    results.passed = true;
    console.log(`PASS: ${JSON.stringify(results.summary)}`);
  } catch (error) {
    results.passed = false;
    results.failure = error.message;
    throw error;
  } finally {
    if (monitor) clearInterval(monitor);
    while (monitoring) await sleep(100);
    results.summary = summarize();
    results.finishedAt = new Date().toISOString();
    persist();
    await Promise.all(
      Object.values(clients).map((client) => client.$disconnect())
    );
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
