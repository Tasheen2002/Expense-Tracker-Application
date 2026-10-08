const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assess, validateLocalDatabase } = require('./lib/outbox-recovery-policy.cjs');
const id = '123e4567-e89b-42d3-a456-426614174001';
const workspaceId = '123e4567-e89b-42d3-a456-426614174002';
const event = () => ({ eventType: 'BudgetPlanUpdated', aggregateType: 'BudgetPlan', aggregateId: id,
  status: 'DEAD_LETTER', error: 'Unmapped event type', payload: { planId: id } });
test('repairs only the proven workspace and preserves the original event payload', () => {
  const input = event(); input.payload.name = 'Historical plan';
  assert.deepEqual(assess(input, { workspaceId }), { reason: 'recoverable', payload: { ...input.payload, workspaceId } });
  assert.equal(input.payload.workspaceId, undefined);
});
for (const [label, mutation, owner, reason] of [
  ['missing owner', {}, null, 'owner_missing'],
  ['wrong workspace', { payload: { planId: id, workspaceId: id } }, { workspaceId }, 'workspace_mismatch'],
  ['wrong aggregate', { payload: { planId: workspaceId } }, { workspaceId }, 'aggregate_mismatch'],
  ['active lease', { status: 'PROCESSING' }, { workspaceId }, 'not_dead_letter'],
  ['unrelated error', { error: 'Unique constraint failed' }, { workspaceId }, 'unrelated_failure'],
  ['notification event', { eventType: 'expense.approved' }, { workspaceId }, 'unsupported_contract'],
  ['wrong aggregate type', { aggregateType: 'Expense' }, { workspaceId }, 'unsupported_contract'],
  ['invalid owner scope', {}, { workspaceId: 'invalid' }, 'owner_missing'],
]) test(`refuses ${label}`, () => assert.equal(assess({ ...event(), ...mutation }, owner).reason, reason));
test('rejects remote databases and unexpected database names', () => {
  validateLocalDatabase('postgresql://user:pass@localhost:5432/expense_tracker_expense');
  for (const url of ['postgresql://user:pass@remote.example/expense_tracker_expense',
    'postgresql://user:pass@localhost/production', 'https://localhost/expense_tracker_expense']) {
    assert.throws(() => validateLocalDatabase(url));
  }
});
