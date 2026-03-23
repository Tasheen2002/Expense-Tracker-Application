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
