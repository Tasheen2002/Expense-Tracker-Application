// Local smoke databases only. Replays only this soak's ten registration events.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const {
  readFileSync,
  writeFileSync,
  appendFileSync,
  copyFileSync,
  existsSync,
} = require('node:fs');
const { spawnSync } = require('node:child_process');
const jwt = require('../apps/gateway/node_modules/jsonwebtoken');
const config = require('dotenv').parse(readFileSync('.env.docker-smoke'));
const base = `postgresql://postgres:${encodeURIComponent(config.POSTGRES_PASSWORD)}@127.0.0.1:15432/expense_tracker_`;
const clients = {};
for (const [name, service, generated] of [
  ['identity', 'identity-access', 'identity'],
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
const results = {
  startedAt: new Date().toISOString(),
  checks: [],
  replayedEvents: [],
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function eventually(check, label, timeout = 90000) {
  const end = Date.now() + timeout;
  do {
    if (await check()) return;
    await sleep(1000);
  } while (Date.now() < end);
  throw new Error(`Timeout: ${label}`);
}
function record(label) {
  results.checks.push(label);
  console.log(`PASS: ${label}`);
}
function migrate() {
  const log = 'account-event-local-migrations.log';
  writeFileSync(log, `Local migrations ${new Date().toISOString()}\n`);
  for (const [service, db] of [
    ['audit-compliance-service', 'audit'],
    ['notification-service', 'notification'],
  ]) {
    const schema = `apps/${service}/prisma/schema.prisma`;
    for (const args of [
      ['migrate', 'deploy'],
      ['migrate', 'status'],
      [
        'migrate',
        'diff',
        '--from-schema-datasource',
        schema,
        '--to-schema-datamodel',
        schema,
        '--exit-code',
      ],
    ]) {
      const command = args[1] === 'diff' ? args : [...args, '--schema', schema];
      const r = spawnSync(
        process.execPath,
        ['node_modules/prisma/build/index.js', ...command],
        {
          env: { ...process.env, DATABASE_URL: base + db },
          encoding: 'utf8',
          maxBuffer: 1024 * 1024,
        }
      );
      appendFileSync(log, (r.stdout || '') + (r.stderr || ''));
      assert.equal(
        r.status,
        0,
        `Local ${service} migration verification failed; inspect log`
      );
    }
    record(`local ${service} migration, status and drift verified`);
  }
}
async function api(
  path,
  token,
  method = 'GET',
  payload,
  expected = 200,
  extra = {}
) {
  const r = await fetch('http://127.0.0.1:13001' + path, {
    method,
    signal: AbortSignal.timeout(10000),
    headers: {
      authorization: `Bearer ${token}`,
      ...extra,
      ...(payload === undefined ? {} : { 'content-type': 'application/json' }),
    },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  assert.equal(r.status, expected, `${method} ${path}: ${r.status}`);
  return r.json();
}
async function actorToken(userId) {
  // Reuse the real active session established by the original soak login.
  // Fixture JWTs are signed locally and never stored or printed.
  const session = await clients.identity.authSession.findFirstOrThrow({
    where: { userId, expiresAt: { gt: new Date() } },
    include: { user: true },
  });
  return jwt.sign(
    { userId, email: session.user.email, sessionId: session.token },
    config.JWT_SECRET,
    { expiresIn: '20m' }
  );
}
async function main() {
  try {
    if (process.argv.includes('--migrate-only')) {
      migrate();
      return;
    }
    if (!existsSync('backend-soak-initial-results.json'))
      copyFileSync(
        'backend-soak-results.json',
        'backend-soak-initial-results.json'
      );
    const soak = JSON.parse(
      readFileSync('backend-soak-initial-results.json', 'utf8')
    );
    assert.equal(soak.actors.length, 10);
    assert.equal(
      soak.passed,
      false,
      'Replay targets must come from the original failed soak'
    );
    const userIds = soak.actors.map((a) => a.userId);
    const events = await clients.identity.outboxEvent.findMany({
      where: { aggregateId: { in: userIds }, eventType: 'UserCreated' },
    });
    assert.equal(events.length, 10);
    assert.ok(
      events.every((event) =>
        ['DEAD_LETTER', 'PROCESSED'].includes(event.status)
      ),
      'Do not modify claimed or retrying events'
    );
    const historical = await clients.identity.outboxEvent.count({
      where: { status: 'DEAD_LETTER', id: { notIn: events.map((e) => e.id) } },
    });
    const reset = await clients.identity.outboxEvent.updateMany({
      where: { id: { in: events.map((e) => e.id) }, status: 'DEAD_LETTER' },
      data: {
        status: 'PENDING',
        retryCount: 0,
        error: null,
        leaseToken: null,
        leaseExpiresAt: null,
        nextAttemptAt: new Date(),
      },
    });
    results.resetCount = reset.count;
    await eventually(
      async () =>
        (await clients.identity.outboxEvent.count({
          where: {
            id: { in: events.map((e) => e.id) },
            status: 'PROCESSED',
          },
        })) === 10,
      'normal Identity worker delivery'
    );
    for (const event of events) {
      assert.equal(
        await clients.audit.accountAuditLog.count({
          where: { id: event.id, userId: event.aggregateId },
        }),
        1
      );
      assert.equal(
        await clients.notification.accountNotification.count({
          where: { id: event.id, userId: event.aggregateId },
        }),
        1
      );
      assert.equal(
        await clients.notification.accountNotificationRequest.count({
          where: { id: event.id },
        }),
        1
      );
      const source = await clients.identity.outboxEvent.findUniqueOrThrow({
        where: { id: event.id },
      });
      assert.equal(source.deliveredTo.length, 2);
      const payload = {
        eventId: event.id,
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        payload: event.payload,
        timestamp: event.createdAt.toISOString(),
      };
      for (const port of [13009, 13008]) {
        const response = await fetch(
          `http://127.0.0.1:${port}/api/v1/event-outbox/events`,
          {
            method: 'POST',
            signal: AbortSignal.timeout(10000),
            headers: {
              'content-type': 'application/json',
              'x-internal-api-key': config.INTERNAL_API_KEY,
            },
            body: JSON.stringify(payload),
          }
        );
        assert.equal(response.status, 200);
        assert.equal((await response.json()).duplicate, true);
      }
      assert.equal(
        await clients.notification.outboxEvent.count({
          where: {
            aggregateId: event.id,
            eventType: 'account.notification.created',
          },
        }),
        1
      );
      results.replayedEvents.push({
        eventId: event.id,
        userId: event.aggregateId,
        status: source.status,
        subscriberCount: source.deliveredTo.length,
      });
    }
    record(
      'all ten original registration events processed through the normal worker, each with one account audit and one notification'
    );
    record(
      'duplicate redelivery returns 200 without duplicate notifications, receipts or creation events'
    );
    assert.equal(
      await clients.identity.outboxEvent.count({
        where: {
          status: 'DEAD_LETTER',
          id: { notIn: events.map((e) => e.id) },
        },
      }),
      historical
    );
    record('historical dead letters outside this soak were left untouched');
    await eventually(
      async () =>
        (await clients.notification.outboxEvent.count({
          where: {
            aggregateId: { in: events.map((e) => e.id) },
            status: { not: 'PROCESSED' },
          },
        })) === 0,
      'account notification events delivered to Audit'
    );
    const own = soak.actors[0],
      other = soak.actors[1];
    const ownToken = await actorToken(own.userId),
      otherToken = await actorToken(other.userId);
    const mine = await api('/api/v1/account/notifications', ownToken);
    assert.equal(mine.data.total, 1);
    assert.equal(mine.data.items[0].userId, own.userId);
    const spoof = await api(
      '/api/v1/account/notifications',
      otherToken,
      'GET',
      undefined,
      200,
      {
        'x-user-id': own.userId,
        'x-workspace-id': own.workspaceId,
        'x-internal-api-key': 'forged',
      }
    );
    assert.ok(spoof.data.items.every((row) => row.userId === other.userId));
    const id = mine.data.items[0].id;
    await api(
      `/api/v1/account/notifications/${id}/read`,
      otherToken,
      'PATCH',
      undefined,
      404
    );
    await api(`/api/v1/account/notifications/${id}/read`, ownToken, 'PATCH');
    await api(`/api/v1/account/notifications/${id}/read`, ownToken, 'PATCH');
    assert.equal(
      await clients.notification.outboxEvent.count({
        where: { aggregateId: id, eventType: 'account.notification.read' },
      }),
      1
    );
    const audit = await api('/api/v1/account/audit-logs', ownToken);
    assert.ok(
      audit.data.total >= 2 &&
        audit.data.items.every(
          (row) => row.userId === own.userId && row.scope === 'account'
        )
    );
    await api(
      `/api/v1/account/audit-logs?userId=${own.userId}`,
      otherToken,
      'GET',
      undefined,
      400
    );
    await api(
      '/api/v1/account/notification-preferences',
      ownToken,
      'PUT',
      { inAppEnabled: true, userId: other.userId },
      400
    );
    const workspaceNotifications = await api(
      `/api/v1/workspaces/${own.workspaceId}/notifications`,
      ownToken
    );
    assert.equal(workspaceNotifications.data.pagination.total, 0);
    assert.deepEqual(workspaceNotifications.data.notifications, []);
    const workspaceAudit = await api(
      `/api/v1/workspaces/${own.workspaceId}/audit-logs`,
      ownToken
    );
    assert.ok(
      workspaceAudit.data.items.every(
        (row) =>
          row.workspaceId === own.workspaceId &&
          row.entityType !== 'User' &&
          row.entityType !== 'AccountNotification'
      )
    );
    record(
      'Gateway account routes derive ownership from verified sessions, reject spoofing and foreign read-marking, and exclude account records from workspace lists'
    );
    await eventually(
      async () =>
        (await clients.notification.outboxEvent.count({
          where: {
            aggregateId: { in: events.map((e) => e.id) },
            status: { not: 'PROCESSED' },
          },
        })) === 0,
      'read event audit delivery'
    );
    results.passed = true;
  } catch (error) {
    results.failure = error.message;
    results.passed = false;
    throw error;
  } finally {
    await Promise.all(
      Object.values(clients).map((client) => client.$disconnect())
    );
    if (!process.argv.includes('--migrate-only')) {
      results.finishedAt = new Date().toISOString();
      writeFileSync(
        'account-event-local-results.json',
        JSON.stringify(results, null, 2)
      );
    }
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
