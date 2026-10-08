const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const { parse } = require('dotenv');
const { PrismaClient } = require('../apps/categorization-service/node_modules/.prisma/client-categorization');

// Run from the repository root against the isolated local expense-smoke stack.
const config = parse(readFileSync('.env.docker-smoke'));
const ports = { identity: 13002, expense: 13003, categorization: 13004, notification: 13008, audit: 13009 };
const prisma = new PrismaClient({ datasources: { db: { url:
  `postgresql://postgres:${encodeURIComponent(config.POSTGRES_PASSWORD)}@127.0.0.1:15432/expense_tracker_categorization` } } });
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
async function eventually(check, label) {
  const deadline = Date.now() + 45000;
  let lastError;
  while (Date.now() < deadline) {
    try { if (await check()) return; } catch (error) { lastError = error; }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out: ${label}${lastError ? ` (${lastError.message})` : ''}`);
}
async function main() {
  await Promise.all(Object.keys(ports).map(service => request(service, '/health')));
  const email = `categorization-${randomUUID()}@example.test`, password = `Smoke-${randomUUID()}!`;
  await request('identity', '/api/v1/auth/register', 'POST', { email, password, fullName: 'Categorization smoke' });
  const login = await request('identity', '/api/v1/auth/login', 'POST', { email, password });
  const actor = { email, userId: login.data.user.userId, token: login.data.token };
  const workspace = await request('identity', '/api/v1/workspaces', 'POST', { name: `Categorization ${randomUUID().slice(0, 8)}` }, actor);
  const workspaceId = workspace.data.workspaceId, scoped = `/api/v1/workspaces/${workspaceId}`;
  const creatorEmail = `expense-creator-${randomUUID()}@example.test`, creatorPassword = `Smoke-${randomUUID()}!`;
  await request('identity', '/api/v1/auth/register', 'POST', { email: creatorEmail, password: creatorPassword, fullName: 'Expense creator' });
  const creatorLogin = await request('identity', '/api/v1/auth/login', 'POST', { email: creatorEmail, password: creatorPassword });
  const creator = { email: creatorEmail, userId: creatorLogin.data.user.userId, token: creatorLogin.data.token };
  const invitation = await request('identity', `${scoped}/invitations`, 'POST', { email: creatorEmail, role: 'member' }, actor, workspaceId);
  await request('identity', `/api/v1/invitations/${invitation.data.token}/accept`, 'POST', {}, creator);
  const category = await request('expense', `${scoped}/categories`, 'POST', { name: 'Verified category' }, actor, workspaceId);
  const categoryId = category.data.categoryId;
  const expense = await request('expense', `${scoped}/expenses`, 'POST', {
    title: 'Categorization smoke expense', amount: 12.5, currency: 'USD', expenseDate: new Date().toISOString(),
    merchant: 'Verified Shop', paymentMethod: 'CASH', isReimbursable: false,
  }, creator, workspaceId);
  const expenseId = expense.data.expenseId;
  await request('categorization', `${scoped}/rules`, 'POST', { name: 'Verified merchant', priority: 10,
    conditionType: 'MERCHANT_EQUALS', conditionValue: 'Verified Shop', targetCategoryId: categoryId }, actor, workspaceId);
  const evaluation = await request('categorization', `${scoped}/evaluate`, 'POST', {
    expenseId, expenseData: { merchant: 'Forged caller snapshot', amount: 999 },
  }, actor, workspaceId);
  const suggestionId = evaluation.data.suggestion.id;
  assert(suggestionId, 'Evaluation must use the persisted expense snapshot and create a suggestion');
  let createdEvent;
  await eventually(async () => {
    createdEvent = await prisma.outboxEvent.findFirst({ where: { aggregateId: suggestionId, eventType: 'CategorySuggestionCreated' } });
    const notifications = await request('notification', `${scoped}/notifications`, 'GET', undefined, creator, workspaceId);
    return notifications.data.notifications.some(row => row.id === createdEvent?.id && row.title === 'Category suggestion available');
  }, 'expense creator receives the suggestion notification');
  assert.equal(createdEvent.payload.expenseOwnerId, creator.userId);
  const replayPayload = event => ({ eventId: event.id, eventType: event.eventType,
    aggregateId: event.aggregateId, aggregateType: event.aggregateType, payload: event.payload, timestamp: event.createdAt.toISOString() });
  const replay = await request('notification', '/api/v1/event-outbox/events', 'POST', replayPayload(createdEvent));
  assert.equal(replay.duplicate, true);
  const creatorNotifications = await request('notification', `${scoped}/notifications`, 'GET', undefined, creator, workspaceId);
  assert.equal(creatorNotifications.data.notifications.filter(row => row.id === createdEvent.id).length, 1);
  const adminNotifications = await request('notification', `${scoped}/notifications`, 'GET', undefined, actor, workspaceId);
  assert(!adminNotifications.data.notifications.some(row => row.id === createdEvent.id), 'Suggestion requester must not receive the expense creator notification');
  await request('notification', `${scoped}/notification-preferences`, 'PATCH', { inApp: false }, creator, workspaceId);
  const suppressedSuggestion = await request('categorization', `${scoped}/suggestions`, 'POST', {
    expenseId, suggestedCategoryId: categoryId, confidence: 0.8,
  }, actor, workspaceId);
  let suppressedEvent;
  await eventually(async () => {
    suppressedEvent = await prisma.outboxEvent.findFirst({ where: { aggregateId: suppressedSuggestion.data.id, eventType: 'CategorySuggestionCreated' } });
    return suppressedEvent?.status === 'PROCESSED';
  }, 'opted-out creation event acknowledged by both subscribers');
  await request('notification', `${scoped}/notification-preferences`, 'PATCH', { inApp: true }, creator, workspaceId);
  const suppressedReplay = await request('notification', '/api/v1/event-outbox/events', 'POST', replayPayload(suppressedEvent));
  assert.equal(suppressedReplay.suppressed, true); assert.equal(suppressedReplay.duplicate, true);
  const afterOptIn = await request('notification', `${scoped}/notifications`, 'GET', undefined, creator, workspaceId);
  assert(!afterOptIn.data.notifications.some(row => row.id === suppressedEvent.id));
  await request('categorization', `${scoped}/suggestions/${suggestionId}/accept`, 'PATCH', {}, actor, workspaceId);
  await eventually(async () => (await request('expense', `${scoped}/expenses/${expenseId}`, 'GET', undefined, actor, workspaceId)).data.categoryId === categoryId,
    'accepted suggestion applied to expense');
  let event;
  await eventually(async () => {
    event = await prisma.outboxEvent.findFirst({ where: { aggregateId: suggestionId, eventType: 'CategorySuggestionAccepted' } });
    return event?.status === 'PROCESSED' && event.deliveredTo.length === 2;
  }, 'both accepted-event destinations acknowledged');
  await eventually(async () => {
    const audit = await request('audit', `${scoped}/audit-logs?entityId=${suggestionId}`, 'GET', undefined, actor, workspaceId);
    return audit.data.items.some(row => JSON.stringify(row).includes('CategorySuggestionAccepted'));
  }, 'accepted event visible in audit API');
  const beforeReplay = (await request('expense', `${scoped}/expenses/${expenseId}`, 'GET', undefined, actor, workspaceId)).data;
  await request('expense', '/event-outbox/events', 'POST', { eventId: event.id, eventType: event.eventType, payload: event.payload });
  const afterReplay = (await request('expense', `${scoped}/expenses/${expenseId}`, 'GET', undefined, actor, workspaceId)).data;
  assert.equal(afterReplay.version, beforeReplay.version, 'Duplicate delivery must not change the expense version');
  assert.equal(afterReplay.categoryId, categoryId);
  const result = { verifiedAt: new Date().toISOString(), workspaceId, expenseId, suggestionId, eventId: event.id,
    categoryId, checks: ['Docker health', 'owner-service snapshot', 'acceptance persisted', 'expense updated',
      'both deliveries recorded', 'audit API', 'duplicate delivery leaves version unchanged',
      'expense creator receives notification', 'requesting administrator excluded', 'notification deduplication',
      'in-app preference suppression survives replay'], expenseVersion: afterReplay.version };
  writeFileSync('categorization-live-verification.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
