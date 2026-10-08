const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const config = require('dotenv').parse(readFileSync('.env.docker-smoke'));
const base = `postgresql://postgres:${encodeURIComponent(config.POSTGRES_PASSWORD)}@127.0.0.1:15432/expense_tracker_`;
const { PrismaClient } = require('../apps/approval-policy-service/node_modules/.prisma/client-approval');
const prisma = new PrismaClient({ datasources: { db: { url: base + 'approval' } } });
const gateway = 'http://127.0.0.1:13001';
async function request(path, method, body, token) {
  const r = await fetch(gateway + path, { method, signal: AbortSignal.timeout(15000),
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body) });
  return { status: r.status, value: await r.json() };
}
async function ok(path, body, token, status = 200) {
  const r = await request(path, 'POST', body, token);
  assert.equal(r.status, status, `${path}: ${r.status} ${r.value.message || ''}`);
  return r.value.data;
}
async function main() {
  try {
    const email = `approval-race-${randomUUID()}@example.test`, password = `Race-${randomUUID()}!`;
    await ok('/api/v1/auth/register', { email, password, fullName: 'Approval Race' }, undefined, 201);
    const login = await ok('/api/v1/auth/login', { email, password });
    const token = login.token;
    const memberEmail = `approval-member-${randomUUID()}@example.test`, memberPassword = `Member-${randomUUID()}!`;
    await ok('/api/v1/auth/register', { email: memberEmail, password: memberPassword, fullName: 'Approval Member' }, undefined, 201);
    const member = await ok('/api/v1/auth/login', { email: memberEmail, password: memberPassword });
    const workspace = await ok('/api/v1/workspaces', { name: `Approval Race ${randomUUID().slice(0, 8)}` }, token, 201);
    const prefix = `/api/v1/workspaces/${workspace.workspaceId}`;
    const invitation = await ok(prefix + '/invitations', { email: memberEmail, role: 'member' }, token, 201);
    await ok(`/api/v1/invitations/${invitation.token}/accept`, {}, member.token);
    const chain = await ok(prefix + '/approval-chains', { name: 'Race chain', requiresReceipt: false, approverSequence: [login.user.userId] }, token, 201);
    await ok(prefix + `/approval-chains/${chain.chainId}/activate`, {}, token);
    const expense = await ok(prefix + '/expenses', { title: 'Concurrent approval verification', amount: 101, currency: 'USD',
      expenseDate: new Date().toISOString(), paymentMethod: 'CASH', isReimbursable: false }, member.token, 201);
    await ok(prefix + `/expenses/${expense.expenseId}/submit`, {}, member.token);
    await ok(prefix + '/workflows', { expenseId: expense.expenseId }, member.token, 201);
    const race = await Promise.all(Array.from({ length: 6 }, () => request(prefix + `/workflows/${expense.expenseId}/approve`, 'POST', { expectedStepNumber: 1 }, token)));
    assert.ok(race.some(r => r.status === 200), `Approval results: ${JSON.stringify(race)}`);
    assert.ok(race.filter(r => r.status !== 200).every(r => [400, 409, 422].includes(r.status)));
    const workflow = await prisma.expenseWorkflow.findUniqueOrThrow({ where: { expenseId: expense.expenseId }, include: { steps: true } });
    assert.equal(workflow.status, 'APPROVED');
    assert.equal(workflow.steps.filter(s => s.status === 'APPROVED').length, 1);
    assert.equal(await prisma.outboxEvent.count({ where: { eventType: 'approval.workflow_completed', payload: { path: ['expenseId'], equals: expense.expenseId } } }), 1);
    writeFileSync('approval-concurrency-results.json', JSON.stringify({ verifiedAt: new Date().toISOString(), workspaceId: workspace.workspaceId,
      statuses: race.map(r => r.status), workflowStatus: workflow.status, completionEvents: 1 }, null, 2));
    console.log('PASS: six concurrent approvals produce one persisted transition and one completion event');
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
