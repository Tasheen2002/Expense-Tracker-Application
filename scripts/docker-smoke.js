const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { execFileSync } = require('node:child_process');
const { parse } = require('dotenv');

// Operates only on the isolated expense-smoke Compose project and its local ports.
const config = parse(readFileSync('.env.docker-smoke'));
const compose = ['compose', '-p', 'expense-smoke', '--env-file', '.env.docker-smoke',
  '-f', 'docker-compose.yml', '-f', 'docker-compose.mailpit.yml', '-f', 'docker-compose.smoke.yml'];
const ports = { identity: 13002, expense: 13003, approval: 13005, bank: 13006, notification: 13008, audit: 13009 };
async function request(service, path, method = 'GET', body, actor, workspaceId) {
  const response = await fetch(`http://127.0.0.1:${ports[service]}${path}`, {
    method, signal: AbortSignal.timeout(15000), headers: {
      'content-type': 'application/json', 'x-internal-api-key': config.INTERNAL_API_KEY,
      ...(actor ? { authorization: `Bearer ${actor.token}`, 'x-user-id': actor.userId, 'x-user-email': actor.email } : {}),
      ...(workspaceId ? { 'x-workspace-id': workspaceId } : {}),
    }, body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json();
  assert(response.ok, `${service} ${method} ${path}: HTTP ${response.status}, ${json.message || json.error || 'failed'}`);
  return json;
}
async function eventually(check, label, timeout = 90000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try { if (await check()) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out: ${label}`);
}
async function healthy() {
  await Promise.all(Object.keys(ports).map(service => eventually(async () => {
    await request(service, '/health'); return true;
  }, `${service} health`)));
}
async function createUser(label) {
  const email = `docker-${label}-${randomUUID()}@example.test`;
  const password = `Docker-${randomUUID()}!`;
  await request('identity', '/api/v1/auth/register', 'POST', { email, password, fullName: `Docker ${label}` });
  const login = await request('identity', '/api/v1/auth/login', 'POST', { email, password });
  return { userId: login.data.user.userId, email, token: login.data.token };
}
async function main() {
  await healthy(); console.log('All six service HTTP health checks passed.');
  const owner = await createUser('approver'), requester = await createUser('requester');
  const workspace = await request('identity', '/api/v1/workspaces', 'POST', { name: `Docker Smoke ${randomUUID().slice(0, 8)}` }, owner);
  const workspaceId = workspace.data.workspaceId;
  const scoped = `/api/v1/workspaces/${workspaceId}`;
  const invitation = await request('identity', `${scoped}/invitations`, 'POST', { email: requester.email, role: 'member' }, owner, workspaceId);
  await request('identity', `/api/v1/invitations/${invitation.data.token}/accept`, 'POST', {}, requester);
  const chain = await request('approval', `${scoped}/approval-chains`, 'POST', {
    name: 'Docker Smoke Approval', requiresReceipt: false, approverSequence: [owner.userId],
  }, owner, workspaceId);
  await request('approval', `${scoped}/approval-chains/${chain.data.chainId}/activate`, 'POST', {}, owner, workspaceId);
  const budget = await request('expense', `${scoped}/budgets`, 'POST', {
    name: 'Docker Smoke Budget', totalAmount: 100, currency: 'USD', periodType: 'MONTHLY', startDate: new Date().toISOString(),
  }, owner, workspaceId);
  const budgetId = budget.data.budgetId;
  const allocation = await request('expense', `${scoped}/budgets/${budgetId}/allocations`, 'POST', {
    allocatedAmount: 100, alertThreshold: 80,
  }, owner, workspaceId);
  await request('expense', `${scoped}/budgets/${budgetId}/activate`, 'POST', {}, owner, workspaceId);
  const expense = await request('expense', `${scoped}/expenses`, 'POST', {
    title: 'Docker smoke expense', amount: 101, currency: 'USD', expenseDate: new Date().toISOString(),
    paymentMethod: 'CASH', isReimbursable: true,
  }, requester, workspaceId);
  const expenseId = expense.data.expenseId;
  await request('expense', `${scoped}/expenses/${expenseId}/submit`, 'POST', {}, requester, workspaceId);
  await request('approval', `${scoped}/workflows`, 'POST', { expenseId }, requester, workspaceId);
  await request('approval', `${scoped}/workflows/${expenseId}/approve`, 'POST', { expectedStepNumber: 1 }, owner, workspaceId);
  await eventually(async () => (await request('expense', `${scoped}/expenses/${expenseId}`, 'GET', undefined, requester, workspaceId)).data.status === 'APPROVED', 'expense approved by completion webhook');
  await eventually(async () => (await request('expense', `${scoped}/budgets/${budgetId}`, 'GET', undefined, owner, workspaceId)).data.status === 'EXCEEDED', 'budget spending updated');
  const allocations = await request('expense', `${scoped}/budgets/${budgetId}/allocations`, 'GET', undefined, owner, workspaceId);
  assert.equal(Number(allocations.data.items.find(row => row.allocationId === allocation.data.allocationId).spentAmount), 101);
  await eventually(async () => {
    const response = await request('notification', `${scoped}/notifications`, 'GET', undefined, requester, workspaceId);
    return response.data.notifications.some(row => row.type === 'EXPENSE_APPROVED');
  }, 'requester approval notification');
  await eventually(async () => {
    const response = await request('notification', `${scoped}/notifications`, 'GET', undefined, owner, workspaceId);
    return response.data.notifications.some(row => row.type === 'BUDGET_ALERT');
  }, 'creator budget notification');
  await eventually(async () => {
    const response = await request('audit', `${scoped}/audit-logs`, 'GET', undefined, owner, workspaceId);
    return response.data.items.some(row => row.entityId === expenseId);
  }, 'persisted expense audit records');
  console.log('Approval, budget spending, audit records and both notification audiences passed.');
  const emailRequestId = randomUUID();
  const enqueueEmail = () => execFileSync('docker', ['exec', 'expense_smoke_notification', 'node',
    '/app/apps/notification-service/dist/queue-docker-mailpit-smoke.cjs', workspaceId, owner.userId, emailRequestId],
    { encoding: 'utf8', timeout: 30000 });
  enqueueEmail();
  const capturedEmails = async () => {
    const response = await fetch('http://127.0.0.1:18025/api/v1/messages', { signal: AbortSignal.timeout(5000) });
    assert(response.ok);
    const inbox = await response.json();
    return inbox.messages.filter(message => message.Subject === `Docker Mailpit smoke ${emailRequestId}`);
  };
  await eventually(async () => (await capturedEmails()).length === 1, 'Docker worker email captured in Mailpit');
  enqueueEmail();
  execFileSync('docker', [...compose, 'restart', ...Object.keys(ports).map(name => ({
    identity: 'identity-access-service', expense: 'expense-budgeting-service', approval: 'approval-policy-service',
    bank: 'bank-feed-service', notification: 'notification-service', audit: 'audit-compliance-service',
  })[name])], { stdio: 'pipe', timeout: 120000 });
  await healthy();
  assert.equal((await capturedEmails()).length, 1, 'Email replay or restart duplicated delivery');
  assert.equal((await request('expense', `${scoped}/expenses/${expenseId}`, 'GET', undefined, requester, workspaceId)).data.status, 'APPROVED');
  assert.equal((await request('expense', `${scoped}/budgets/${budgetId}`, 'GET', undefined, owner, workspaceId)).data.status, 'EXCEEDED');
  const result = { result: 'passed', workspaceId, expenseId, budgetId, health: 'six services healthy after restart',
    workflow: 'approval → expense → budget → audit and notifications', email: 'Mailpit capture and replay passed', externalEmail: 'disabled' };
  const report = join(tmpdir(), 'expense-tracker-docker-smoke-result.json');
  writeFileSync(report, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ...result, report }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
