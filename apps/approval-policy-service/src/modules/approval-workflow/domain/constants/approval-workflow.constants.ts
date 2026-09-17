/**
 * Approval Workflow Module Constants
 */

// Approval Chain validation constants
export const APPROVAL_CHAIN_NAME_MIN_LENGTH = 1;
export const APPROVAL_CHAIN_NAME_MAX_LENGTH = 100;
export const APPROVAL_CHAIN_DESCRIPTION_MAX_LENGTH = 500;

// Approver sequence validation
export const MIN_APPROVERS = 1;
export const MAX_APPROVERS = 10;

// Amount validation for approval chains
export const MIN_APPROVAL_AMOUNT = 0;
export const MAX_APPROVAL_AMOUNT = 999999999.99;

// Auto-approval threshold
export const AUTO_APPROVAL_THRESHOLD = 50; // $50 or less = auto-approve

// Workflow step validation
export const APPROVAL_COMMENTS_MAX_LENGTH = 1000;
export const REJECTION_COMMENTS_MIN_LENGTH = 1;
export const REJECTION_COMMENTS_MAX_LENGTH = 1000;

// Initial workflow state constants
export const INITIAL_STEP_NUMBER = 1;
export const INITIAL_WORKFLOW_VERSION = 1;

// Pagination constants
export const DEFAULT_PAGE_LIMIT = 50;
export const MAX_PAGE_LIMIT = 100;
export const MIN_PAGE_OFFSET = 0;

// Outbox Aggregate Types
export const AGGREGATE_TYPE_APPROVAL_CHAIN = 'ApprovalChain';
export const AGGREGATE_TYPE_EXPENSE_WORKFLOW = 'ExpenseWorkflow';

// Timeout and escalation (for future implementation)
export const DEFAULT_APPROVAL_TIMEOUT_HOURS = 48;
export const MAX_APPROVAL_TIMEOUT_HOURS = 720; // 30 days
