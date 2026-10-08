import { WebhookRoutes } from '@expense-tracker/outbox-kit';

export function createWebhookRoutes(env: NodeJS.ProcessEnv = process.env): WebhookRoutes {
  const audit = `${env.AUDIT_SERVICE_URL ?? 'http://localhost:3009'}/api/v1/event-outbox/events`;
  const notifications = `${env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3008'}/api/v1/event-outbox/events`;
  const expenses = `${env.EXPENSE_SERVICE_URL ?? 'http://localhost:3003'}/event-outbox/events`;
  return {
    CategoryRuleCreated: [audit], CategoryRuleActivated: [audit], CategoryRuleDeactivated: [audit],
    CategoryRuleUpdated: [audit], CategoryRuleDeleted: [audit], 'category_rule.executed': [audit],
    CategorySuggestionCreated: [audit, notifications], CategorySuggestionAccepted: [audit, expenses],
    CategorySuggestionRejected: [audit], CategorySuggestionDeleted: [audit],
  };
}
