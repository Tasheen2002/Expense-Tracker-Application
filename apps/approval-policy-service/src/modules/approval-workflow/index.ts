/**
 * Approval Workflow Module
 *
 * Public API Boundary
 * Following Domain-Driven Design & Modular Monolith architecture.
 * Exposes core module functionality to other modules and the application root.
 */

// Route Registration
export { registerApprovalWorkflowRoutes } from './infrastructure/http/routes';

// Domain error types (used by cross-cutting error handlers)
export {
  ApprovalWorkflowDomainError,
  ApprovalChainNotFoundError,
  ApprovalStepNotFoundError,
  InvalidApprovalTransitionError,
  UnauthorizedApproverError,
  ApprovalAlreadyProcessedError,
  InvalidDelegationError,
  WorkflowNotFoundError,
  WorkflowAlreadyExistsError,
  NoMatchingApprovalChainError,
  SelfApprovalNotAllowedError,
  WorkflowAlreadyCompletedError,
  WorkflowStepNotFoundError,
  InvalidStepNumberError,
  CurrentStepNotFoundError,
  RejectionReasonRequiredError,
  EmptyApproverSequenceError,
  MaxApproversExceededError,
  DuplicateApproversInSequenceError,
  InvalidAmountRangeError,
  InvalidApprovalChainNameError,
  ApprovalChainDescriptionTooLongError,
  ApprovalCommentTooLongError,
  UnauthorizedWorkflowCancellationError,
  UnauthorizedWorkflowViewError,
  WorkflowStepMismatchError,
  ApprovalChainInUseError,
  ConcurrencyConflictError,
} from './domain/errors';

// Domain enums & types (safe to share — value objects, not entities)
export {
  ApprovalStatus,
  type ApprovalStatusType,
  WorkflowStatus,
  type WorkflowStatusType,
} from './domain/enums';

// Domain constants
export {
  APPROVAL_CHAIN_NAME_MIN_LENGTH,
  APPROVAL_CHAIN_NAME_MAX_LENGTH,
  APPROVAL_CHAIN_DESCRIPTION_MAX_LENGTH,
  MIN_APPROVERS,
  MAX_APPROVERS,
  MIN_APPROVAL_AMOUNT,
  MAX_APPROVAL_AMOUNT,
  AUTO_APPROVAL_THRESHOLD,
  APPROVAL_COMMENTS_MAX_LENGTH,
  REJECTION_COMMENTS_MIN_LENGTH,
  REJECTION_COMMENTS_MAX_LENGTH,
  INITIAL_STEP_NUMBER,
  INITIAL_WORKFLOW_VERSION,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  MIN_PAGE_OFFSET,
  AGGREGATE_TYPE_APPROVAL_CHAIN,
  AGGREGATE_TYPE_EXPENSE_WORKFLOW,
  DEFAULT_APPROVAL_TIMEOUT_HOURS,
  MAX_APPROVAL_TIMEOUT_HOURS,
} from './domain/constants';

// DTOs (type-only exports — safe for cross-module consumption)
export type { ApprovalChainDTO } from './domain/entities/approval-chain.entity';
export type { ExpenseWorkflowDTO } from './domain/entities/expense-workflow.entity';
export type { ApprovalStepDTO } from './domain/entities/approval-step.entity';

// Value objects (safe to consume by other modules)
export {
  ApprovalChainId,
  WorkflowId,
  ApprovalStepId,
  ApprovalAmount,
} from './domain/value-objects';

// Commands & Queries (CQRS application layer)
export * from './application/commands';
export * from './application/queries';

// Application Services
export * from './application/services';
