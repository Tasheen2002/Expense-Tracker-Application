import type { WebhookRoutes } from '@expense-tracker/outbox-kit';

export function allocationWebhookRoutes(auditServiceUrl: string): WebhookRoutes {
  const audit = `${auditServiceUrl}/api/v1/event-outbox/events`;
  return {
    DepartmentCreated: [audit],
    DepartmentUpdated: [audit],
    DepartmentActivated: [audit],
    DepartmentDeactivated: [audit],
    CostCenterCreated: [audit],
    CostCenterUpdated: [audit],
    CostCenterActivated: [audit],
    CostCenterDeactivated: [audit],
    ProjectCreated: [audit],
    ProjectUpdated: [audit],
    ProjectActivated: [audit],
    ProjectDeactivated: [audit],
    ExpenseAllocationCreated: [audit],
    ExpenseAllocationDeleted: [audit],
    ExpenseAllocationsReplaced: [audit],
  };
}
