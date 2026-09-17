/**
 * Centralized, strongly-typed event registry for approval-policy-service.
 *
 * Defines transport-neutral domain event constants across the service.
 */

export const APPROVAL_POLICY_EVENTS = {
  // Approval Chain Events
  APPROVAL_CHAIN_CREATED: 'approval-chain.created',
  APPROVAL_CHAIN_UPDATED: 'approval-chain.updated',
  APPROVAL_CHAIN_APPROVER_SEQUENCE_CHANGED: 'approval-chain.approver-sequence-changed',
  APPROVAL_CHAIN_ACTIVATED: 'approval-chain.activated',
  APPROVAL_CHAIN_DEACTIVATED: 'approval-chain.deactivated',
  APPROVAL_CHAIN_DELETED: 'approval-chain.deleted',

  // Expense Workflow Events
  WORKFLOW_STARTED: 'approval.workflow_started',
  WORKFLOW_STEP_COMPLETED: 'approval.step_completed',
  WORKFLOW_COMPLETED: 'approval.workflow_completed',
  WORKFLOW_REJECTED: 'approval.workflow_rejected',
  WORKFLOW_STEP_DELEGATED: 'approval.step_delegated',
  WORKFLOW_STEP_DELEGATED_LEGACY: 'approval_step.delegated',
  WORKFLOW_CANCELLED: 'approval.workflow_cancelled',

  // Expense Policy Events
  POLICY_CREATED: 'policy.created',
  POLICY_UPDATED: 'policy.updated',
  POLICY_ACTIVATED: 'policy.activated',
  POLICY_DEACTIVATED: 'policy.deactivated',

  // Policy Violation Events
  VIOLATION_DETECTED: 'violation.detected',
  VIOLATION_ACKNOWLEDGED: 'violation.acknowledged',
  VIOLATION_RESOLVED: 'violation.resolved',

  // Policy Exemption Events
  EXEMPTION_REQUESTED: 'exemption.requested',
  EXEMPTION_APPROVED: 'exemption.approved',
  EXEMPTION_REJECTED: 'exemption.rejected',
  EXEMPTION_EXPIRED: 'exemption.expired',
} as const;

export type ApprovalPolicyEventType =
  (typeof APPROVAL_POLICY_EVENTS)[keyof typeof APPROVAL_POLICY_EVENTS];

// Re-export buildWebhookRoutes from infrastructure for backward-compatibility
export { buildWebhookRoutes } from '../infrastructure/webhooks/webhook-routing';
