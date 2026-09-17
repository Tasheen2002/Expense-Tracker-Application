import { APPROVAL_POLICY_EVENTS } from '../../events/approval-policy-events';

/**
 * Builds the default webhook routing table using strongly-typed event constants.
 *
 * Placed cleanly in the infrastructure layer to keep domain events free from
 * transport and deployment endpoint concerns.
 */
export function buildWebhookRoutes(config: {
  auditServiceUrl: string;
  notificationServiceUrl: string;
  expenseServiceUrl?: string;
}): Record<string, string[]> {
  const { auditServiceUrl, notificationServiceUrl, expenseServiceUrl } = config;

  const auditEndpoint = `${auditServiceUrl}/api/v1/event-outbox/events`;
  const notificationEndpoint = `${notificationServiceUrl}/api/v1/event-outbox/events`;
  const expenseEndpoint = expenseServiceUrl
    ? `${expenseServiceUrl}/api/v1/event-outbox/events`
    : undefined;

  const workflowOutcomeEndpoints = expenseEndpoint
    ? [auditEndpoint, notificationEndpoint, expenseEndpoint]
    : [auditEndpoint, notificationEndpoint];

  return {
    // Chains -> Audit
    [APPROVAL_POLICY_EVENTS.APPROVAL_CHAIN_CREATED]: [auditEndpoint],
    [APPROVAL_POLICY_EVENTS.APPROVAL_CHAIN_UPDATED]: [auditEndpoint],
    [APPROVAL_POLICY_EVENTS.APPROVAL_CHAIN_APPROVER_SEQUENCE_CHANGED]: [auditEndpoint],
    [APPROVAL_POLICY_EVENTS.APPROVAL_CHAIN_ACTIVATED]: [auditEndpoint],
    [APPROVAL_POLICY_EVENTS.APPROVAL_CHAIN_DEACTIVATED]: [auditEndpoint],
    [APPROVAL_POLICY_EVENTS.APPROVAL_CHAIN_DELETED]: [auditEndpoint],

    // Workflows -> Audit + Notification (+ Expense Service for state synchronization)
    [APPROVAL_POLICY_EVENTS.WORKFLOW_STARTED]: [auditEndpoint, notificationEndpoint],
    [APPROVAL_POLICY_EVENTS.WORKFLOW_STEP_COMPLETED]: [auditEndpoint, notificationEndpoint],
    [APPROVAL_POLICY_EVENTS.WORKFLOW_COMPLETED]: workflowOutcomeEndpoints,
    [APPROVAL_POLICY_EVENTS.WORKFLOW_REJECTED]: workflowOutcomeEndpoints,
    [APPROVAL_POLICY_EVENTS.WORKFLOW_STEP_DELEGATED]: [auditEndpoint, notificationEndpoint],
    [APPROVAL_POLICY_EVENTS.WORKFLOW_CANCELLED]: workflowOutcomeEndpoints,

    // Policies -> Audit
    [APPROVAL_POLICY_EVENTS.POLICY_CREATED]: [auditEndpoint],
    [APPROVAL_POLICY_EVENTS.POLICY_UPDATED]: [auditEndpoint],
    [APPROVAL_POLICY_EVENTS.POLICY_ACTIVATED]: [auditEndpoint],
    [APPROVAL_POLICY_EVENTS.POLICY_DEACTIVATED]: [auditEndpoint],

    // Violations -> Audit + Notification
    [APPROVAL_POLICY_EVENTS.VIOLATION_DETECTED]: [auditEndpoint, notificationEndpoint],
    [APPROVAL_POLICY_EVENTS.VIOLATION_ACKNOWLEDGED]: [auditEndpoint],
    [APPROVAL_POLICY_EVENTS.VIOLATION_RESOLVED]: [auditEndpoint],

    // Exemptions -> Audit + Notification
    [APPROVAL_POLICY_EVENTS.EXEMPTION_REQUESTED]: [auditEndpoint, notificationEndpoint],
    [APPROVAL_POLICY_EVENTS.EXEMPTION_APPROVED]: [auditEndpoint, notificationEndpoint],
    [APPROVAL_POLICY_EVENTS.EXEMPTION_REJECTED]: [auditEndpoint, notificationEndpoint],
    [APPROVAL_POLICY_EVENTS.EXEMPTION_EXPIRED]: [auditEndpoint, notificationEndpoint],
  };
}
