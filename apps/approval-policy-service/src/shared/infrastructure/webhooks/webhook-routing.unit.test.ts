import { describe, it, expect } from 'vitest';
import { buildWebhookRoutes } from './webhook-routing';
import { APPROVAL_POLICY_EVENTS } from '../../events/approval-policy-events';

describe('Approval Policy Webhook Routing Table', () => {
  const AUDIT_SERVICE_URL = 'http://localhost:3009';
  const NOTIFICATION_SERVICE_URL = 'http://localhost:3008';

  const routes = buildWebhookRoutes({
    auditServiceUrl: AUDIT_SERVICE_URL,
    notificationServiceUrl: NOTIFICATION_SERVICE_URL,
  });

  it('should map every domain event registered in APPROVAL_POLICY_EVENTS', () => {
    const allEventConstants = Object.values(APPROVAL_POLICY_EVENTS);

    expect(allEventConstants.length).toBeGreaterThan(0);

    for (const eventType of allEventConstants) {
      // Legacy event constant may be skipped if explicitly deprecated, otherwise must have a valid route
      if (eventType === APPROVAL_POLICY_EVENTS.WORKFLOW_STEP_DELEGATED_LEGACY) {
        continue;
      }
      expect(routes[eventType], `Missing webhook route for event: ${eventType}`).toBeDefined();
      expect(Array.isArray(routes[eventType])).toBe(true);
      expect(routes[eventType].length).toBeGreaterThan(0);

      // Verify valid URL format
      for (const endpoint of routes[eventType]) {
        expect(endpoint).toMatch(/^https?:\/\//);
        expect(endpoint).toContain('/api/v1/event-outbox/events');
      }
    }
  });

  it('should route critical lifecycle events to both Audit and Notification services', () => {
    const dualRoutedEvents = [
      APPROVAL_POLICY_EVENTS.WORKFLOW_STARTED,
      APPROVAL_POLICY_EVENTS.WORKFLOW_STEP_COMPLETED,
      APPROVAL_POLICY_EVENTS.WORKFLOW_COMPLETED,
      APPROVAL_POLICY_EVENTS.WORKFLOW_REJECTED,
      APPROVAL_POLICY_EVENTS.VIOLATION_DETECTED,
      APPROVAL_POLICY_EVENTS.EXEMPTION_REQUESTED,
      APPROVAL_POLICY_EVENTS.EXEMPTION_APPROVED,
      APPROVAL_POLICY_EVENTS.EXEMPTION_REJECTED,
    ];

    for (const eventType of dualRoutedEvents) {
      const endpoints = routes[eventType];
      expect(endpoints).toBeDefined();
      expect(endpoints).toHaveLength(2);
      expect(endpoints.some((url) => url.startsWith(AUDIT_SERVICE_URL))).toBe(true);
      expect(endpoints.some((url) => url.startsWith(NOTIFICATION_SERVICE_URL))).toBe(true);
    }
  });

  it('should route chain administrative events to Audit service', () => {
    const auditOnlyEvents = [
      APPROVAL_POLICY_EVENTS.APPROVAL_CHAIN_CREATED,
      APPROVAL_POLICY_EVENTS.APPROVAL_CHAIN_UPDATED,
      APPROVAL_POLICY_EVENTS.APPROVAL_CHAIN_ACTIVATED,
      APPROVAL_POLICY_EVENTS.APPROVAL_CHAIN_DEACTIVATED,
      APPROVAL_POLICY_EVENTS.APPROVAL_CHAIN_DELETED,
      APPROVAL_POLICY_EVENTS.POLICY_CREATED,
      APPROVAL_POLICY_EVENTS.POLICY_UPDATED,
      APPROVAL_POLICY_EVENTS.VIOLATION_ACKNOWLEDGED,
      APPROVAL_POLICY_EVENTS.VIOLATION_RESOLVED,
    ];

    for (const eventType of auditOnlyEvents) {
      const endpoints = routes[eventType];
      expect(endpoints).toBeDefined();
      expect(endpoints).toHaveLength(1);
      expect(endpoints[0]).toBe(`${AUDIT_SERVICE_URL}/api/v1/event-outbox/events`);
    }
  });

  it('should route workflow completion and rejection to Expense service when configured', () => {
    const EXPENSE_SERVICE_URL = 'http://localhost:3003';
    const routesWithExpense = buildWebhookRoutes({
      auditServiceUrl: AUDIT_SERVICE_URL,
      notificationServiceUrl: NOTIFICATION_SERVICE_URL,
      expenseServiceUrl: EXPENSE_SERVICE_URL,
    });

    const expenseSyncEvents = [
      APPROVAL_POLICY_EVENTS.WORKFLOW_COMPLETED,
      APPROVAL_POLICY_EVENTS.WORKFLOW_REJECTED,
      APPROVAL_POLICY_EVENTS.WORKFLOW_CANCELLED,
    ];

    for (const eventType of expenseSyncEvents) {
      const endpoints = routesWithExpense[eventType];
      expect(endpoints).toBeDefined();
      expect(endpoints).toHaveLength(3);
      expect(endpoints.some((url) => url.startsWith(AUDIT_SERVICE_URL))).toBe(true);
      expect(endpoints.some((url) => url.startsWith(NOTIFICATION_SERVICE_URL))).toBe(true);
      expect(endpoints.some((url) => url.startsWith(EXPENSE_SERVICE_URL))).toBe(true);
      expect(endpoints).toContain(`${EXPENSE_SERVICE_URL}/api/v1/event-outbox/events`);
    }
  });
});
