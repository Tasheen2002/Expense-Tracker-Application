const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const config = require('dotenv').parse(readFileSync('.env.docker-smoke'));
const gateway = 'http://127.0.0.1:13001';
const base = `postgresql://postgres:${encodeURIComponent(config.POSTGRES_PASSWORD)}@127.0.0.1:15432/expense_tracker_`;
const db = {};
for (const [name, client] of Object.entries({ expense: 'expense', approval: 'approval', categorization: 'categorization',
  receipt: 'receipt-vault', notification: 'notification', audit: 'audit', bank_feed: 'bank-feed' })) {
  const { PrismaClient } = require(`../apps/${{ expense: 'expense-budgeting', approval: 'approval-policy',
    categorization: 'categorization', receipt: 'receipt-vault', notification: 'notification', audit: 'audit-compliance',
    bank_feed: 'bank-feed' }[name]}-service/node_modules/.prisma/client-${client}`);
  db[name] = new PrismaClient({ datasources: { db: { url: base + name } } });
}
const results = { verifiedAt: new Date().toISOString(), checks: [], requestCount: 0, bankingProvider: 'controlled local HTTP fixture' };
const stopped = new Set();
let lastRequestAt = 0;
function docker(args) {
  const result = spawnSync('docker', args, { encoding: 'utf8', timeout: 45000 });
  if (result.status !== 0) throw new Error(`Docker ${args[0]} failed`);
  return result.stdout.trim();
}
function record(label) { results.checks.push(label); console.log(`PASS: ${label}`); }
async function request(path, method = 'GET', body, actor, expected = 200, extra = {}) {
  // Each Gateway call can also consume downstream membership-check quota.
  // Pace fixtures rather than disabling production rate limits or retrying writes.
  const delay = Math.max(0, 2000 - (Date.now() - lastRequestAt));
  if (delay) await new Promise(resolve => setTimeout(resolve, delay));
  lastRequestAt = Date.now();
  results.requestCount++;
  const response = await fetch(gateway + path, { method, signal: AbortSignal.timeout(15000), headers: {
    ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    ...(actor ? { authorization: `Bearer ${actor.token}` } : {}), ...extra,
  }, body: body === undefined ? undefined : JSON.stringify(body) });
  const value = response.headers.get('content-type')?.includes('json') ? await response.json() : null;
  assert.ok([].concat(expected).includes(response.status), `${method} ${path}: ${response.status}; ${value?.message || value?.error || ''}`);
  return { response, value };
}
async function json(...args) { return (await request(...args)).value; }
async function eventually(check, label, timeout = 60000) {
  const deadline = Date.now() + timeout;
  let lastError;
  while (Date.now() < deadline) {
    try { const value = await check(); if (value) return value; } catch (error) { lastError = error; }
    await new Promise(resolve => setTimeout(resolve, 750));
  }
  throw new Error(`Timeout: ${label}${lastError ? ': ' + lastError.message : ''}`);
}
async function serviceReady(name, port) {
  await eventually(async () => (await fetch(`http://127.0.0.1:${port}/health`, {
    headers: { 'x-internal-api-key': config.INTERNAL_API_KEY }, signal: AbortSignal.timeout(3000),
  })).ok, `${name} ready`);
}
async function stop(name) { docker(['stop', '--time', '10', `expense_smoke_${name}`]); stopped.add(name); }
async function start(name, port) { docker(['start', `expense_smoke_${name}`]); await serviceReady(name, port); stopped.delete(name); }
async function user(label) {
  const email = `gateway-${label}-${randomUUID()}@example.test`, password = `Smoke-${randomUUID()}!`;
  await json('/api/v1/auth/register', 'POST', { email, password, fullName: `Gateway ${label}` }, undefined, 201);
  const login = await json('/api/v1/auth/login', 'POST', { email, password });
  return { email, userId: login.data.user.userId, token: login.data.token };
}
const replayPayload = event => ({ eventId: event.id, eventType: event.eventType,
  aggregateId: event.aggregateId, aggregateType: event.aggregateType, payload: event.payload, timestamp: event.createdAt.toISOString() });
async function replay(service, port, path, event) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, { method: 'POST',
    headers: { 'content-type': 'application/json', 'x-internal-api-key': config.INTERNAL_API_KEY },
    body: JSON.stringify(replayPayload(event)), signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, `${service} internal replay`);
  return response.json();
}
async function expense(path, actor, title, amount = 12.34) {
  return (await json(path + '/expenses', 'POST', { title, amount, currency: 'USD',
    expenseDate: new Date().toISOString(), paymentMethod: 'CASH', isReimbursable: false }, actor, 201)).data;
}
async function main() {
  try {
    await eventually(async () => (await fetch(gateway + '/health')).ok, 'all eight gateway dependencies ready');
    await request('/live'); await request('/health'); record('all eight services ready through gateway');
    const owner = await user('owner'), member = await user('member'), outsider = await user('outsider');
    const workspace = await json('/api/v1/workspaces', 'POST', { name: `Gateway Workflow ${randomUUID().slice(0, 8)}` }, owner, 201);
    const workspaceId = workspace.data.workspaceId, path = `/api/v1/workspaces/${workspaceId}`;
    results.workspaceId = workspaceId;
    await request(path, 'GET', undefined, outsider, [403, 404]);
    await request(path + '/expenses', 'GET', undefined, undefined, 401);
    const invitation = await json(path + '/invitations', 'POST', { email: member.email, role: 'member' }, owner, 201);
    await json(`/api/v1/invitations/${invitation.data.token}/accept`, 'POST', {}, member);
    const foreign = await json('/api/v1/workspaces', 'POST', { name: `Other ${randomUUID().slice(0, 8)}` }, owner, 201);
    const foreignPath = `/api/v1/workspaces/${foreign.data.workspaceId}`;
    for (const suffix of ['expenses', 'budgets', 'approval-chains', 'rules', 'receipts', 'bank-feed-sync/connections', 'notifications', 'audit-logs']) {
      await request(path + '/' + suffix, 'GET', undefined, outsider, [403, 404]);
    }
    await request(path + '/expenses', 'GET', undefined, outsider, [403, 404], {
      'x-user-id': owner.userId, 'x-workspace-id': workspaceId, 'x-internal-api-key': 'forged', 'x-service-principal': 'system',
    });
    await request(path + '/approval-chains', 'POST', { name: 'Denied', approverSequence: [owner.userId], requiresReceipt: false }, member, 403);
    record('outsider denied across all eight contexts; spoofed headers and insufficient role rejected');

    const chain = await json(path + '/approval-chains', 'POST', { name: 'Gateway approval', requiresReceipt: false,
      approverSequence: [owner.userId] }, owner, 201);
    await json(path + `/approval-chains/${chain.data.chainId}/activate`, 'POST', {}, owner);
    const budget = await json(path + '/budgets', 'POST', { name: 'Gateway budget', totalAmount: 100,
      currency: 'USD', periodType: 'MONTHLY', startDate: new Date().toISOString() }, owner, 201);
    await json(path + `/budgets/${budget.data.budgetId}/allocations`, 'POST', { allocatedAmount: 100, alertThreshold: 80 }, owner, 201);
    await json(path + `/budgets/${budget.data.budgetId}/activate`, 'POST', {}, owner);
    const submitted = await expense(path, member, 'Gateway approved expense', 101);
    results.approvedExpenseId = submitted.expenseId;
    await json(path + `/expenses/${submitted.expenseId}/submit`, 'POST', {}, member);
    await json(path + '/workflows', 'POST', { expenseId: submitted.expenseId }, member, 201);
    await json(path + `/workflows/${submitted.expenseId}/approve`, 'POST', { expectedStepNumber: 1 }, owner);
    await eventually(async () => (await db.expense.expense.findUnique({ where: { id: submitted.expenseId } }))?.status === 'APPROVED', 'approved expense persisted');
    await eventually(async () => (await db.expense.budget.findUnique({ where: { id: budget.data.budgetId } }))?.status === 'EXCEEDED', 'budget spending updated');
    await eventually(async () => (await db.notification.notification.count({ where: { workspaceId, recipientId: member.userId, type: 'EXPENSE_APPROVED' } })) > 0, 'requester notification');
    await eventually(async () => (await db.notification.notification.count({ where: { workspaceId, recipientId: owner.userId, type: 'BUDGET_ALERT' } })) > 0, 'creator budget notification');
    assert.equal((await json(path + `/expenses/${submitted.expenseId}`, 'GET', undefined, member)).data.status, 'APPROVED');
    assert.equal((await json(path + `/budgets/${budget.data.budgetId}`, 'GET', undefined, owner)).data.status, 'EXCEEDED');
    assert.ok((await json(path + '/notifications', 'GET', undefined, member)).data.notifications.some(row => row.type === 'EXPENSE_APPROVED'));
    assert.ok((await json(path + '/notifications', 'GET', undefined, owner)).data.notifications.some(row => row.type === 'BUDGET_ALERT'));
    const complete = await eventually(async () => db.approval.outboxEvent.findFirst({ where: { eventType: 'approval.workflow_completed',
      payload: { path: ['expenseId'], equals: submitted.expenseId }, status: 'PROCESSED' } }), 'workflow destinations acknowledged');
    const before = await db.expense.expense.findUniqueOrThrow({ where: { id: submitted.expenseId } });
    await replay('expense', 13003, '/event-outbox/events', complete);
    const after = await db.expense.expense.findUniqueOrThrow({ where: { id: submitted.expenseId } });
    assert.equal(after.version, before.version);
    record('expense approval, budget update, both notification audiences, and completion replay deduplication');

    const draft = await expense(path, member, 'Gateway category expense');
    const category = await json(path + '/categories', 'POST', { name: 'Gateway category' }, owner, 201);
    const suggestion = await json(path + '/suggestions', 'POST', { expenseId: draft.expenseId,
      suggestedCategoryId: category.data.categoryId, confidence: 0.9 }, owner, 201);
    const suggestionId = suggestion.data.id;
    await request(path + `/suggestions/${suggestionId}/accept`, 'PATCH', {}, member, 403);
    await json(path + `/suggestions/${suggestionId}/accept`, 'PATCH', {}, owner);
    const accepted = await eventually(async () => db.categorization.outboxEvent.findFirst({ where: {
      aggregateId: suggestionId, eventType: 'CategorySuggestionAccepted', status: 'PROCESSED' } }), 'category destinations acknowledged');
    assert.equal(accepted.deliveredTo.length, 2);
    const categorized = await json(path + `/expenses/${draft.expenseId}`, 'GET', undefined, member);
    assert.equal(categorized.data.categoryId, category.data.categoryId);
    await replay('expense', 13003, '/event-outbox/events', accepted);
    assert.equal((await json(path + `/expenses/${draft.expenseId}`, 'GET', undefined, member)).data.version, categorized.data.version);
    await eventually(async () => (await db.audit.auditLog.count({ where: { workspaceId, entityId: suggestionId } })) > 0, 'category audit');
    assert.ok((await json(path + `/audit-logs?entityId=${suggestionId}`, 'GET', undefined, owner)).data.items.length > 0);
    record('category acceptance updates expense; destination receipts and replay preserve expense version');

    const department = (await json(path + '/departments', 'POST', {
      name: 'Workflow department', code: 'WF_DEPT',
    }, owner, 201)).data;
    const foreignDepartment = (await json(foreignPath + '/departments', 'POST', {
      name: 'Foreign department', code: 'WF_DEPT',
    }, owner, 201)).data;
    await request(path + `/expenses/${draft.expenseId}/allocations`, 'POST', {
      allocations: [{ departmentId: foreignDepartment.id, amount: 12.34 }],
    }, owner, 400);
    assert.equal(await db.expense.expenseAllocation.count({ where: { expenseId: draft.expenseId, workspaceId } }), 0);
    await json(path + `/expenses/${draft.expenseId}/allocations`, 'POST', {
      allocations: [{ departmentId: department.id, amount: 12.34, percentage: 100 }],
    }, owner, [200, 201]);
    const allocations = await db.expense.expenseAllocation.findMany({ where: { expenseId: draft.expenseId, workspaceId } });
    assert.equal(allocations.length, 1);
    assert.equal(allocations[0].departmentId, department.id);
    assert.equal(Number(allocations[0].amount), 12.34);
    record('cost allocation rejects foreign targets and persists the correct workspace target and amount');

    const plan = (await json(path + '/budget-plans', 'POST', {
      name: 'Workflow plan', periodType: 'CUSTOM', startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    }, owner, 201)).data;
    await json(path + `/budget-plans/${plan.id}/activate`, 'PATCH', {}, owner);
    await json(path + `/budget-plans/${plan.id}/archive`, 'PATCH', {}, owner);
    assert.equal((await json(path + `/budget-plans/${plan.id}`, 'GET', undefined, owner)).data.status, 'ARCHIVED');
    await request(foreignPath + `/budget-plans/${plan.id}`, 'GET', undefined, owner, 404);
    record('budget plan create/activate/archive and cross-workspace record isolation');

    const supplier = (await json(path + '/suppliers', 'POST', { name: 'Workflow supplier' }, owner, 201)).data;
    const location = (await json(path + '/locations', 'POST', { name: 'Workflow warehouse' }, owner, 201)).data;
    const po = (await json(path + '/purchase-orders', 'POST', {
      supplierId: supplier.supplierId, orderDate: new Date().toISOString(), currency: 'USD',
    }, owner, 201)).data;
    const variantId = `workflow-${randomUUID()}`;
    await json(path + `/purchase-orders/${po.purchaseOrderId}/items`, 'POST', {
      variantId, variantName: 'Workflow item', quantity: 5, unitPrice: 2.5,
    }, owner, 201);
    await json(path + `/purchase-orders/${po.purchaseOrderId}/submit`, 'POST', {}, owner);
    await json(path + `/purchase-orders/${po.purchaseOrderId}/approve`, 'POST', {}, owner);
    await json(path + `/purchase-orders/${po.purchaseOrderId}/receive`, 'POST', { locationId: location.locationId }, owner);
    const receivedStock = await db.expense.stock.findFirstOrThrow({ where: { workspaceId, variantId, locationId: location.locationId } });
    assert.equal(receivedStock.quantity, 5);
    const movements = await db.expense.inventoryTransaction.count({ where: { workspaceId, referenceId: po.purchaseOrderId } });
    assert.equal(movements, 1);
    await request(path + `/purchase-orders/${po.purchaseOrderId}/receive`, 'POST', { locationId: location.locationId }, owner, [400, 409]);
    assert.equal((await db.expense.stock.findUniqueOrThrow({ where: { id: receivedStock.id } })).quantity, 5);
    assert.equal(await db.expense.inventoryTransaction.count({ where: { workspaceId, referenceId: po.purchaseOrderId } }), movements);
    record('purchase-order receiving persists stock and one movement; repeated receiving cannot double stock');

    const bankExpense = await expense(path, owner, 'Gateway bank purchase');
    const foreignExpense = await expense(foreignPath, owner, 'Foreign workspace expense');
    await request(foreignPath + `/expenses/${bankExpense.expenseId}`, 'GET', undefined, owner, 404);
    const bytes = Buffer.from(`%PDF-1.7\nGateway workflow receipt ${randomUUID()}`);
    const uploaded = await json(path + '/receipts/upload', 'POST', { originalName: 'gateway.pdf', mimeType: 'application/pdf',
      fileContent: bytes.toString('base64') }, owner, 201);
    const receiptId = uploaded.data.receiptId;
    await request(path + '/receipts/upload', 'POST', { originalName: 'spoofed.jpg', mimeType: 'image/jpeg',
      fileContent: Buffer.from(`%PDF-1.7\nMIME spoof fixture ${randomUUID()}`).toString('base64') }, owner, 400);
    const oversized = await fetch(gateway + path + '/receipts/upload', {
      method: 'POST', headers: { authorization: `Bearer ${owner.token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ originalName: 'oversized.pdf', mimeType: 'application/pdf',
        fileContent: 'A'.repeat(Math.ceil(50 * 1024 * 1024 / 3) * 4 + 4097) }),
      signal: AbortSignal.timeout(30000),
    });
    results.requestCount++;
    assert.equal(oversized.status, 413, 'oversized upload rejected through Gateway and Receipt');
    await oversized.arrayBuffer();
    await request(path + '/receipts/upload', 'POST', { originalName: 'duplicate.pdf', mimeType: 'application/pdf',
      fileContent: bytes.toString('base64') }, owner, 409);
    await request(path + `/receipts/${receiptId}/download`, 'GET', undefined, member, [403, 404]);
    await request(path + `/receipts/${receiptId}/link-expense`, 'POST', { expenseId: foreignExpense.expenseId }, owner, 404);
    await json(path + `/receipts/${receiptId}/link-expense`, 'POST', { expenseId: bankExpense.expenseId }, owner);
    const linked = await json(path + `/expenses/${bankExpense.expenseId}/receipts`, 'GET', undefined, owner);
    assert.ok(linked.data.items.some(row => row.receiptId === receiptId));
    let download = await request(path + `/receipts/${receiptId}/download`, 'GET', undefined, owner);
    assert.deepEqual(Buffer.from(await download.response.arrayBuffer()), bytes);
    docker(['restart', 'expense_smoke_receipt']); await serviceReady('receipt', 13007);
    download = await request(path + `/receipts/${receiptId}/download`, 'GET', undefined, owner);
    assert.deepEqual(Buffer.from(await download.response.arrayBuffer()), bytes);
    const receiptRow = await db.receipt.receipt.findUniqueOrThrow({ where: { id: receiptId } });
    await request(path + `/receipts/${receiptId}?permanent=true`, 'DELETE', undefined, owner, [200, 204]);
    await eventually(async () => (await db.receipt.outboxEvent.findFirst({ where: { aggregateId: receiptId,
      eventType: 'ReceiptFileDeletionRequested' } }))?.status === 'PROCESSED', 'durable file deletion');
    assert.equal(docker(['exec', 'expense_smoke_receipt', 'node', '-e',
      `process.stdout.write(String(require('fs').existsSync('/app/uploads/${receiptRow.storageKey}')))`]), 'false');
    await request(path + `/receipts/${receiptId}/download`, 'GET', undefined, owner, 404);
    record('private receipt upload/link/download; duplicate and foreign access rejection; restart and physical deletion');

    docker(['cp', 'scripts/bank-provider-smoke.cjs', 'expense_smoke_bank:/tmp/bank-provider-smoke.cjs']);
    docker(['exec', '-d', 'expense_smoke_bank', 'node', '/tmp/bank-provider-smoke.cjs']);
    const connection = await json(path + '/bank-feed-sync/connections', 'POST', {
      institutionId: 'smoke-bank', institutionName: 'Local fixture bank', accountId: randomUUID(), accountName: 'Fixture checking',
      accountType: 'CHECKING', currency: 'USD', accessToken: `smoke-${randomUUID()}`,
    }, owner, 201);
    const connectionId = connection.data.id;
    await json(path + `/bank-feed-sync/connections/${connectionId}/sync`, 'POST', {}, owner);
    const transaction = await db.bank_feed.bankTransaction.findFirstOrThrow({ where: { connectionId } });
    await request(path + `/bank-feed-sync/connections/${connectionId}/sync`, 'POST', {}, owner, 429);
    assert.equal(await db.bank_feed.bankTransaction.count({ where: { connectionId } }), 1);
    await request(path + `/bank-feed-sync/transactions/${transaction.id}/process`, 'PUT', { action: 'import', expenseId: foreignExpense.expenseId }, owner, 404);
    assert.equal((await db.bank_feed.bankTransaction.findUniqueOrThrow({ where: { id: transaction.id } })).status, 'PENDING');
    await json(path + `/bank-feed-sync/transactions/${transaction.id}/process`, 'PUT', { action: 'import', expenseId: bankExpense.expenseId }, owner);
    const imported = await json(path + `/bank-feed-sync/transactions/${transaction.id}`, 'GET', undefined, owner);
    assert.equal(imported.data.status, 'IMPORTED'); assert.equal(imported.data.expenseId, bankExpense.expenseId);
    record('bank provider duplicate rows deduplicated; repeated sync rate-limited; foreign expense rejected; import links same-workspace expense');

    // Use an amount above the domain auto-approval threshold for a manual rejection.
    const rejected = await expense(path, member, 'Workflow rejection', 101);
    await json(path + `/expenses/${rejected.expenseId}/submit`, 'POST', {}, member);
    await json(path + '/workflows', 'POST', { expenseId: rejected.expenseId }, member, 201);
    await json(path + `/workflows/${rejected.expenseId}/reject`, 'POST', { comments: 'Workflow test rejection' }, owner);
    await eventually(async () => (await db.expense.expense.findUnique({ where: { id: rejected.expenseId } }))?.status === 'REJECTED', 'rejected expense persisted');
    await eventually(async () => (await db.notification.notification.count({ where: { workspaceId, recipientId: member.userId, type: 'EXPENSE_REJECTED' } })) > 0, 'requester rejection notification');
    record('workflow rejection propagates to expense and requester notification');

    const policy = (await json(path + '/policies', 'POST', { name: 'Workflow spending policy',
      policyType: 'SPENDING_LIMIT', severity: 'CRITICAL', configuration: { threshold: 10, currency: 'USD' },
    }, owner, 201)).data;
    await json(path + `/policies/${policy.id}/activate`, 'POST', {}, owner);
    const violationCount = await db.approval.policyViolation.count({ where: { workspaceId } });
    const checked = await json(path + '/policies/check', 'POST', { amount: 11, currency: 'USD' }, owner);
    assert.equal(checked.data.wouldPass, false);
    assert.ok(checked.data.potentialViolations.some(row => row.policyType === 'SPENDING_LIMIT'));
    assert.equal(await db.approval.policyViolation.count({ where: { workspaceId } }), violationCount);
    await request(foreignPath + `/policies/${policy.id}`, 'GET', undefined, owner, 404);
    record('active spending policy blocks dry-run check without persisting violations; foreign workspace cannot read policy');

    await stop('audit');
    try {
      await request('/health', 'GET', undefined, undefined, 503); await request('/live');
      const failure = await request(path + '/audit-logs', 'GET', undefined, owner, [502, 503, 504]);
      assert.ok(!JSON.stringify(failure.value).includes('ECONNREFUSED'));
      const recovery = await expense(path, owner, 'Expense during audit outage');
      results.recoveryExpenseId = recovery.expenseId;
      await eventually(async () => db.expense.outboxEvent.findFirst({ where: { aggregateId: recovery.expenseId,
        retryCount: { gt: 0 }, status: { in: ['FAILED', 'PROCESSING'] } } }), 'failed audit delivery remains durable', 20000);
    } finally { await start('audit', 13009); }
    await eventually(async () => (await db.expense.outboxEvent.count({ where: { aggregateId: results.recoveryExpenseId,
      status: { not: 'PROCESSED' } } })) === 0, 'event recovery');
    await eventually(async () => (await db.audit.auditLog.count({ where: { workspaceId, entityId: results.recoveryExpenseId } })) > 0, 'recovered audit record');
    assert.ok((await json(path + `/audit-logs?entityId=${results.recoveryExpenseId}`, 'GET', undefined, owner)).data.items.length > 0);
    record('audit outage: sanitized proxy error, degraded readiness, committed expense, durable retry and recovered audit');

    await stop('identity');
    try {
      await request(path + '/expenses', 'GET', undefined, owner, 503); await request('/live');
    } finally { await start('identity', 13002); }
    await json(path + '/expenses', 'GET', undefined, owner);
    await request('/api/v1/auth/logout', 'POST', undefined, owner, 204);
    await request(path + '/expenses', 'GET', undefined, owner, 401);
    await request('/health');
    record('Identity outage fails closed; restart restores access; logout revokes non-Identity access');
    results.passed = true;
  } catch (error) {
    results.passed = false;
    results.failure = error.message;
    throw error;
  } finally {
    for (const name of stopped) { try { docker(['start', `expense_smoke_${name}`]); } catch {} }
    await Promise.all(Object.values(db).map(client => client.$disconnect()));
    const report = join(process.env.BACKEND_REPORT_DIR || tmpdir(), `gateway-workflow-results-${Date.now()}.json`);
    writeFileSync(report, JSON.stringify(results, null, 2));
    console.log(`Workflow report: ${report}`);
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
