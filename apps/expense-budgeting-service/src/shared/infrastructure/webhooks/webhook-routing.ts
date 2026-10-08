import type { WebhookRoutes } from '@expense-tracker/outbox-kit';
import { expenseWebhookRoutes } from '../../../modules/expense-ledger/infrastructure/outbox/expense-webhook-routes';
import { budgetWebhookRoutes } from '../../../modules/budget-management/infrastructure/outbox/budget-webhook-routes';
import { planningWebhookRoutes } from '../../../modules/budget-planning/infrastructure/outbox/planning-webhook-routes';
import { allocationWebhookRoutes } from '../../../modules/cost-allocation/infrastructure/outbox/allocation-webhook-routes';
import { inventoryWebhookRoutes } from '../../../modules/inventory-management/infrastructure/outbox/inventory-webhook-routes';

export function buildWebhookRoutes(config: {
  auditServiceUrl: string;
  notificationServiceUrl: string;
}): WebhookRoutes {
  const { auditServiceUrl, notificationServiceUrl } = config;
  const audit = `${auditServiceUrl}/api/v1/event-outbox/events`;
  const notification = `${notificationServiceUrl}/api/v1/event-outbox/events`;

  return {
    // Keep historical names readable while existing outbox rows are being delivered.
    ExpenseCreated: [audit],
    ExpenseApproved: [audit],
    ExpenseRejected: [audit],
    ExpenseSubmitted: [audit],
    ExpenseStatusChanged: [audit, notification],
    BudgetThresholdExceeded: [audit, notification],
    BudgetUpdated: [audit],
    DepartmentDeleted: [audit],
    CostCenterDeleted: [audit],
    ProjectDeleted: [audit],
    ...expenseWebhookRoutes(auditServiceUrl, notificationServiceUrl),
    ...budgetWebhookRoutes(auditServiceUrl, notificationServiceUrl),
    ...planningWebhookRoutes(auditServiceUrl),
    ...allocationWebhookRoutes(auditServiceUrl),
    ...inventoryWebhookRoutes(auditServiceUrl),
  };
}
