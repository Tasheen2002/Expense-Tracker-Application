import type { WebhookRoutes } from '@expense-tracker/outbox-kit';
import { EXPENSE_EVENTS } from '@shared/events/expense-events';

export function expenseWebhookRoutes(auditServiceUrl: string, notificationServiceUrl: string): WebhookRoutes {
  const audit = `${auditServiceUrl}/api/v1/event-outbox/events`;
  const notification = `${notificationServiceUrl}/api/v1/event-outbox/events`;
  const routes = Object.fromEntries(
    Object.values(EXPENSE_EVENTS).map((eventType) => [eventType, [audit]])
  );
  routes[EXPENSE_EVENTS.EXPENSE_APPROVED] = [audit, notification];
  routes[EXPENSE_EVENTS.EXPENSE_REJECTED] = [audit, notification];
  routes[EXPENSE_EVENTS.EXPENSE_STATUS_CHANGED] = [audit, notification];
  return routes;
}
