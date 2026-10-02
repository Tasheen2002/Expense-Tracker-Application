import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parse } from 'dotenv';
import { startNotificationService } from '../src/runtime';
import { NotificationType } from '../src/modules/notification-dispatch/domain/enums';
import { Budget } from '../../expense-budgeting-service/src/modules/budget-management/domain/entities/budget.entity';
import { BudgetPeriodType } from '../../expense-budgeting-service/src/modules/budget-management/domain/enums/budget-period-type';

/** Opt-in local smoke test: creates a test user/workspace and leaves captured mail for inspection. */
async function main() {
  const identityEnv = parse(readFileSync(new URL('../../identity-access-service/.env', import.meta.url)));
  const notificationEnv = parse(readFileSync(new URL('../.env', import.meta.url)));
  const auditEnv = parse(readFileSync(new URL('../../audit-compliance-service/.env', import.meta.url)));
  for (const values of [identityEnv, notificationEnv, auditEnv]) {
    const database = new URL(values.DATABASE_URL);
    assert(['localhost', '127.0.0.1'].includes(database.hostname), 'Only local databases are allowed');
  }
  assert(identityEnv.INTERNAL_API_KEY && identityEnv.INTERNAL_API_KEY === notificationEnv.INTERNAL_API_KEY,
    'Configure matching internal keys');
  assert.equal(auditEnv.INTERNAL_API_KEY, notificationEnv.INTERNAL_API_KEY, 'Configure matching Audit key');
  assert.equal(notificationEnv.NOTIFICATION_EMAIL_PROVIDER, 'mailpit');
  const mailpit = notificationEnv.MAILPIT_URL || 'http://localhost:8025';
  assert(['localhost', '127.0.0.1'].includes(new URL(mailpit).hostname), 'Only local Mailpit is allowed');
  // Separate process preserves each service's own TypeScript aliases and environment.
  const identity = spawn(process.execPath, ['dist/index.mjs'], {
    cwd: fileURLToPath(new URL('../../identity-access-service/', import.meta.url)),
    env: { ...process.env, ...identityEnv, NODE_ENV: 'development', PORT: '3002' }, stdio: 'ignore', windowsHide: true,
  });
  let notification: Awaited<ReturnType<typeof startNotificationService>> | undefined;
  let audit: ReturnType<typeof spawn> | undefined;
  try {
    const identityDeadline = Date.now() + 30000;
    while (true) {
      const health = await fetch('http://127.0.0.1:3002/health').catch(() => undefined);
      if (health?.status === 200) break;
      assert(identity.exitCode === null && Date.now() < identityDeadline, 'Identity startup failed');
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    assert(!(await fetch('http://localhost:3009/health').catch(() => undefined)), 'Stop local Audit before the recovery test');
    Object.assign(process.env, notificationEnv, { NODE_ENV: 'development', IDENTITY_SERVICE_URL: 'http://127.0.0.1:3002', AUDIT_SERVICE_URL: 'http://localhost:3009' });
    notification = await startNotificationService({ port: 3008, host: '127.0.0.1', logger: false });
    for (const port of [3002, 3008]) {
      assert.equal((await fetch(`http://127.0.0.1:${port}/health`)).status, 200);
    }
    const email = `mailpit-${randomUUID()}@example.test`;
    const password = `Local-test-${randomUUID()}!`;
    const post = async (path: string, body: object, token?: string) => {
      const response = await fetch(`http://127.0.0.1:3002/api/v1${path}`, { method: 'POST',
        headers: { 'content-type': 'application/json', 'x-internal-api-key': notificationEnv.INTERNAL_API_KEY,
          ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body) });
      assert(response.ok, `Identity ${path} failed (${response.status})`);
      return response.json();
    };
    await post('/auth/register', { email, password, fullName: 'Mailpit Integration Test' });
    const login = await post('/auth/login', { email, password });
    const recipientId: string = login.data.user.userId;
    const workspace = await post('/workspaces', { name: `Mailpit Test ${randomUUID().slice(0, 8)}` }, login.data.token);
    const workspaceId: string = workspace.data.workspaceId;
    assert(recipientId && workspaceId, 'Identity response is missing IDs');
    const lookupResponse = await fetch(`http://127.0.0.1:3002/api/v1/users/${recipientId}`, {
      headers: { 'x-internal-api-key': notificationEnv.INTERNAL_API_KEY, 'x-user-id': recipientId },
    });
    assert.equal(lookupResponse.status, 200, 'Real internal recipient lookup failed');
    const lookupBody = await lookupResponse.json();
    assert.equal(lookupBody.data.userId, recipientId, 'Real lookup returned a mismatched user');
    const budget = Budget.create({ workspaceId, createdBy: recipientId, name: 'Recipient fallback test',
      totalAmount: 100, currency: 'USD', periodType: BudgetPeriodType.MONTHLY, startDate: new Date() });
    budget.activate(); budget.clearDomainEvents(); budget.markAsExceeded(101);
    const thresholdEvent = budget.domainEvents.find(event => event.eventType === 'budget.threshold_exceeded');
    assert(thresholdEvent);
    const thresholdResponse = await fetch('http://127.0.0.1:3008/api/v1/event-outbox/events', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-internal-api-key': notificationEnv.INTERNAL_API_KEY },
      body: JSON.stringify({ eventId: thresholdEvent.eventId, eventType: thresholdEvent.eventType,
        aggregateId: budget.id.getValue(), aggregateType: 'Budget', payload: thresholdEvent.getPayload() }),
    });
    assert.equal(thresholdResponse.status, 201);
    assert.equal((await notification.prisma.notification.findUniqueOrThrow({ where: { id: thresholdEvent.eventId } })).recipientId, recipientId);
    const input = { requestId: randomUUID(), workspaceId, recipientId, type: NotificationType.SYSTEM_ALERT,
      title: `Real Identity Mailpit test ${workspaceId.slice(0, 8)}`,
      content: '<p>Verified using the running Identity Access service and Notification delivery worker.</p>', data: {} };
    // No public send endpoint exists: invoke the supported internal command on the running app.
    const accepted = await notification.compositionRoot.sendNotificationHandler.handle(input);
    const delivered = accepted.data?.find(row => row.channel === 'EMAIL');
    assert(delivered, 'Email was not queued');
    const deadline = Date.now() + 30000;
    let status = '';
    while (Date.now() < deadline) {
      const job = await notification.prisma.emailDelivery.findUniqueOrThrow({ where: { notificationId: delivered.id } });
      status = job.status;
      if (status === 'DELIVERED' || status === 'FAILED' || status === 'RECONCILIATION_REQUIRED') break;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    assert.equal(status, 'DELIVERED', 'Worker did not deliver the email');
    assert.equal((await notification.prisma.notification.findUniqueOrThrow({ where: { id: delivered.id } })).status, 'SENT');
    const captured = async () => {
      const response = await fetch(`${mailpit}/api/v1/messages`);
      assert(response.ok);
      const messages = await response.json();
      return messages.messages.filter((message: { Subject: string }) => message.Subject === input.title);
    };
    assert.equal((await captured()).length, 1);
    await notification.compositionRoot.sendNotificationHandler.handle(input);
    await new Promise(resolve => setTimeout(resolve, 1500));
    assert.equal((await captured()).length, 1, 'Replay produced duplicate email');
    assert.equal(await notification.prisma.emailDelivery.count({ where: { notificationId: delivered.id } }), 1);
    const pendingEvent = await notification.prisma.outboxEvent.findFirstOrThrow({
      where: { aggregateId: delivered.id, eventType: 'notification.created' },
    });
    const failureDeadline = Date.now() + 30000;
    while (true) {
      const event = await notification.prisma.outboxEvent.findUniqueOrThrow({ where: { id: pendingEvent.id } });
      if (event.status === 'FAILED' && event.retryCount > 0) break;
      assert(Date.now() < failureDeadline, 'Expected durable outbox failure while Audit is offline');
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    audit = spawn(process.execPath, ['dist/index.js'], {
      cwd: fileURLToPath(new URL('../../audit-compliance-service/', import.meta.url)),
      env: { ...process.env, ...auditEnv, NODE_ENV: 'development', PORT: '3009' }, stdio: 'ignore', windowsHide: true,
    });
    const recoveryDeadline = Date.now() + 90000;
    while (true) {
      const event = await notification.prisma.outboxEvent.findUniqueOrThrow({ where: { id: pendingEvent.id } });
      if (event.status === 'PROCESSED') break;
      assert(audit.exitCode === null && Date.now() < recoveryDeadline, 'Audit outbox recovery failed');
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    assert.equal((await fetch('http://localhost:3009/health')).status, 200);
    const auditReplay = await fetch('http://localhost:3009/api/v1/event-outbox/events', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-internal-api-key': auditEnv.INTERNAL_API_KEY },
      body: JSON.stringify({ eventId: pendingEvent.id, eventType: pendingEvent.eventType,
        aggregateId: pendingEvent.aggregateId, aggregateType: pendingEvent.aggregateType,
        payload: pendingEvent.payload, timestamp: pendingEvent.createdAt.toISOString() }),
    });
    assert.equal(auditReplay.status, 200);
    assert.equal((await auditReplay.json()).duplicate, true, 'Audit replay should reuse the persisted log');
    console.log(JSON.stringify({ result: 'passed', health: 'three services healthy', recipientId, workspaceId,
      subject: input.title, delivery: status, commandReplay: 'one email captured', identity: 'real HTTP lookup',
      audit: 'offline failure recovered to PROCESSED; replay deduplicated',
      budgetAlert: 'actual Budget threshold event routed to creator' }, null, 2));
  } finally {
    try { await notification?.close(); }
    finally { audit?.kill('SIGTERM'); identity.kill('SIGTERM'); }
  }
}

main().catch(error => { console.error(error instanceof Error ? error.message : 'Local Mailpit verification failed'); process.exitCode = 1; });
