import type { WebhookRoutes } from '@expense-tracker/outbox-kit';
import { BUDGET_PLAN_EVENTS } from '../../domain/constants/planning.constants';

export function planningWebhookRoutes(auditServiceUrl: string): WebhookRoutes {
  const audit = `${auditServiceUrl}/api/v1/event-outbox/events`;
  return Object.fromEntries(
    Object.values(BUDGET_PLAN_EVENTS).map((eventType) => [eventType, [audit]])
  );
}
