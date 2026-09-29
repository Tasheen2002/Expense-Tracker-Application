import type { WebhookRoutes } from '@expense-tracker/outbox-kit';

export function budgetWebhookRoutes(auditServiceUrl: string, notificationServiceUrl: string): WebhookRoutes {
  const audit = `${auditServiceUrl}/api/v1/event-outbox/events`;
  const notification = `${notificationServiceUrl}/api/v1/event-outbox/events`;
  return {
    'budget.created': [audit],
    'budget.activated': [audit],
    'budget.archived': [audit],
    'budget.updated': [audit],
    'budget.deleted': [audit],
    'budget.exhausted': [audit],
    'budget.spending_recorded': [audit],
    'budget.allocation_deleted': [audit],
    'budget.alert_generated': [audit],
    'budget.threshold_exceeded': [audit, notification],
    'spending-limit.created': [audit],
    'spending-limit.updated': [audit],
    'spending-limit.activated': [audit],
    'spending-limit.deactivated': [audit],
    'spending-limit.deleted': [audit],
  };
}
