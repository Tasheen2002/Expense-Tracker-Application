const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Only historical, audit-only contracts whose scope can be proven locally.
const contracts = Object.freeze({
  BudgetPlanCreated: ['BudgetPlan', 'budgetPlan', 'planId'],
  BudgetPlanUpdated: ['BudgetPlan', 'budgetPlan', 'planId'],
  BudgetPlanStatusChanged: ['BudgetPlan', 'budgetPlan', 'planId'],
  DepartmentCreated: ['Department', 'department', 'departmentId'],
  DepartmentUpdated: ['Department', 'department', 'departmentId'],
  DepartmentActivated: ['Department', 'department', 'departmentId'],
  DepartmentDeactivated: ['Department', 'department', 'departmentId'],
  DepartmentDeleted: ['Department', 'department', 'departmentId'],
  CostCenterCreated: ['CostCenter', 'costCenter', 'costCenterId'],
  CostCenterUpdated: ['CostCenter', 'costCenter', 'costCenterId'],
  CostCenterActivated: ['CostCenter', 'costCenter', 'costCenterId'],
  CostCenterDeactivated: ['CostCenter', 'costCenter', 'costCenterId'],
  CostCenterDeleted: ['CostCenter', 'costCenter', 'costCenterId'],
  ProjectCreated: ['Project', 'project', 'projectId'],
  ProjectUpdated: ['Project', 'project', 'projectId'],
  ProjectActivated: ['Project', 'project', 'projectId'],
  ProjectDeactivated: ['Project', 'project', 'projectId'],
  ProjectDeleted: ['Project', 'project', 'projectId'],
});

function assess(event, owner) {
  const contract = contracts[event.eventType];
  if (!contract || event.aggregateType !== contract[0]) return { reason: 'unsupported_contract' };
  if (event.status !== 'DEAD_LETTER') return { reason: 'not_dead_letter' };
  if (!/Unmapped event type|workspaceId|workspace scope/i.test(event.error || '')) return { reason: 'unrelated_failure' };
  const payload = event.payload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)
    || !uuid.test(event.aggregateId) || payload[contract[2]] !== event.aggregateId) return { reason: 'aggregate_mismatch' };
  if (!owner || !uuid.test(owner.workspaceId)) return { reason: 'owner_missing' };
  if (payload.workspaceId !== undefined && payload.workspaceId !== owner.workspaceId) return { reason: 'workspace_mismatch' };
  return { payload: { ...payload, workspaceId: owner.workspaceId }, reason: 'recoverable' };
}

function validateLocalDatabase(value) {
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)
    || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    || !/^\/expense_tracker_[a-z0-9_]+$/.test(url.pathname)) throw new Error('Only local expense_tracker databases are supported');
}

module.exports = { contracts, assess, validateLocalDatabase };
