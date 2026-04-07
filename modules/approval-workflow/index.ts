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
  CurrentStepNotFoundError,
  RejectionReasonRequiredError,
  EmptyApproverSequenceError,
  InvalidAmountRangeError,
} from './domain/errors/approval-workflow.errors';

// Domain enums (safe to share — value objects, not entities)
export { ApprovalStatus } from './domain/enums/approval-status';
export { WorkflowStatus } from './domain/enums/workflow-status';

// DTOs (type-only exports — safe for cross-module consumption)
export type { ApprovalChainDTO } from './domain/entities/approval-chain.entity';
export type { ExpenseWorkflowDTO } from './domain/entities/expense-workflow.entity';
export type { ApprovalStepDTO } from './domain/entities/approval-step.entity';

// Value objects (safe to consume by other modules)
export { ApprovalChainId } from './domain/value-objects/approval-chain-id';
export { WorkflowId } from './domain/value-objects/workflow-id';
