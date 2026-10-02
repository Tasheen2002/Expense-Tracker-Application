import { PureDomainError } from '../../../../shared/errors/pure-domain-error';

// Base class for all approval workflow-related domain errors
export abstract class ApprovalWorkflowDomainError extends PureDomainError {}

export class ApprovalChainNotFoundError extends ApprovalWorkflowDomainError {
  readonly code = 'APPROVAL_CHAIN_NOT_FOUND';
  constructor(chainId: string) {
    super(`Approval chain with ID ${chainId} not found`);
  }
}

export class ApprovalStepNotFoundError extends ApprovalWorkflowDomainError {
  readonly code = 'APPROVAL_STEP_NOT_FOUND';
  constructor(stepId: string) {
    super(`Approval step with ID ${stepId} not found`);
  }
}

export class InvalidApprovalTransitionError extends ApprovalWorkflowDomainError {
  readonly code = 'INVALID_APPROVAL_TRANSITION';
  constructor(from: string, to: string) {
    super(`Invalid approval transition from ${from} to ${to}`);
  }
}

export class UnauthorizedApproverError extends ApprovalWorkflowDomainError {
  readonly code = 'UNAUTHORIZED_APPROVER';
  constructor(userId: string, stepId: string) {
    super(`User ${userId} is not authorized to approve step ${stepId}`);
  }
}

export class ApprovalAlreadyProcessedError extends ApprovalWorkflowDomainError {
  readonly code = 'APPROVAL_ALREADY_PROCESSED';
  constructor(stepId: string) {
    super(`Approval step ${stepId} has already been processed`);
  }
}

export class InvalidDelegationError extends ApprovalWorkflowDomainError {
  readonly code = 'INVALID_DELEGATION';
  constructor(message: string) {
    super(message);
  }
}

export class WorkflowNotFoundError extends ApprovalWorkflowDomainError {
  readonly code = 'WORKFLOW_NOT_FOUND';
  constructor(expenseId: string) {
    super(`Workflow for expense ${expenseId} not found`);
  }
}

export class WorkflowAlreadyExistsError extends ApprovalWorkflowDomainError {
  readonly code = 'WORKFLOW_ALREADY_EXISTS';
  constructor(expenseId: string) {
    super(`Workflow for expense ${expenseId} already exists`);
  }
}

export class ExpenseSnapshotMismatchError extends ApprovalWorkflowDomainError {
  readonly code = 'EXPENSE_SNAPSHOT_MISMATCH';
  constructor(expenseId: string) {
    super(`Expense service returned inconsistent facts for expense ${expenseId}`);
  }
}

export class UnauthorizedWorkflowInitiationError extends ApprovalWorkflowDomainError {
  readonly code = 'UNAUTHORIZED_WORKFLOW_INITIATION';
  constructor(expenseId: string) {
    super(`Not authorized to initiate a workflow for expense ${expenseId}`);
  }
}

export class ExpenseNotSubmittedError extends ApprovalWorkflowDomainError {
  readonly code = 'EXPENSE_NOT_SUBMITTED';
  constructor(expenseId: string, status: string | undefined) {
    super(`Cannot initiate approval workflow for expense ${expenseId} in state '${status}'. Only SUBMITTED expenses are eligible for approval.`);
  }
}

export class NoMatchingApprovalChainError extends ApprovalWorkflowDomainError {
  readonly code = 'NO_MATCHING_APPROVAL_CHAIN';
  constructor(workspaceId: string, amount: number) {
    super(
      `No applicable approval chain found for expense amount ${amount} in workspace ${workspaceId}`
    );
  }
}

export class SelfApprovalNotAllowedError extends ApprovalWorkflowDomainError {
  readonly code = 'SELF_APPROVAL_NOT_ALLOWED';
  constructor(userId: string) {
    super(
      `User ${userId} cannot be in their own approval chain (self-approval is not allowed for fraud prevention)`
    );
  }
}

export class WorkflowAlreadyCompletedError extends ApprovalWorkflowDomainError {
  readonly code = 'WORKFLOW_ALREADY_COMPLETED';
  constructor(expenseId: string, status: string) {
    super(
      `Workflow for expense ${expenseId} is already completed with status: ${status}`
    );
  }
}

export class WorkflowStepNotFoundError extends ApprovalWorkflowDomainError {
  readonly code = 'WORKFLOW_STEP_NOT_FOUND';
  constructor(stepNumber: number) {
    super(`Step ${stepNumber} not found in workflow`);
  }
}

export class InvalidStepNumberError extends ApprovalWorkflowDomainError {
  readonly code = 'INVALID_STEP_NUMBER';
  constructor(stepNumber: number) {
    super(`Step number must be a positive integer, received: ${stepNumber}`);
  }
}

export class CurrentStepNotFoundError extends ApprovalWorkflowDomainError {
  readonly code = 'CURRENT_STEP_NOT_FOUND';
  constructor(expenseId: string) {
    super(`No current step found in workflow for expense ${expenseId}`);
  }
}

export class RejectionReasonRequiredError extends ApprovalWorkflowDomainError {
  readonly code = 'REJECTION_REASON_REQUIRED';
  constructor() {
    super('Rejection reason is required');
  }
}

export class EmptyApproverSequenceError extends ApprovalWorkflowDomainError {
  readonly code = 'EMPTY_APPROVER_SEQUENCE';
  constructor() {
    super('Approval chain must have at least one approver');
  }
}

export class DuplicateApproversInSequenceError extends ApprovalWorkflowDomainError {
  readonly code = 'DUPLICATE_APPROVERS_IN_SEQUENCE';
  constructor() {
    super('Approval chain cannot contain duplicate approvers in sequence');
  }
}

export class InvalidAmountRangeError extends ApprovalWorkflowDomainError {
  readonly code = 'INVALID_AMOUNT_RANGE';
  constructor(
    message: string = 'Min amount cannot be greater than max amount'
  ) {
    super(message);
  }
}

export class InvalidApprovalChainNameError extends ApprovalWorkflowDomainError {
  readonly code = 'INVALID_APPROVAL_CHAIN_NAME';
  constructor(
    message: string = 'Approval chain name cannot be empty'
  ) {
    super(message);
  }
}

export class ConcurrencyConflictError extends ApprovalWorkflowDomainError {
  readonly code = 'CONCURRENCY_CONFLICT';
  constructor(workflowId: string) {
    super(
      `Workflow ${workflowId} was modified by another request. Please retry.`
    );
  }
}

export class MaxApproversExceededError extends ApprovalWorkflowDomainError {
  readonly code = 'MAX_APPROVERS_EXCEEDED';
  constructor(max: number = 10) {
    super(`Approval chain cannot have more than ${max} approvers`);
  }
}

export class ApprovalChainDescriptionTooLongError extends ApprovalWorkflowDomainError {
  readonly code = 'APPROVAL_CHAIN_DESCRIPTION_TOO_LONG';
  constructor(maxLength: number = 500) {
    super(`Approval chain description cannot exceed ${maxLength} characters`);
  }
}

export class ApprovalCommentTooLongError extends ApprovalWorkflowDomainError {
  readonly code = 'APPROVAL_COMMENT_TOO_LONG';
  constructor(maxLength: number = 1000) {
    super(`Comment cannot exceed ${maxLength} characters`);
  }
}

export class UnauthorizedWorkflowCancellationError extends ApprovalWorkflowDomainError {
  readonly code = 'UNAUTHORIZED_WORKFLOW_CANCELLATION';
  constructor(userId: string, expenseId: string) {
    super(
      `User ${userId} is not authorized to cancel workflow for expense ${expenseId}`
    );
  }
}

export class UnauthorizedWorkflowViewError extends ApprovalWorkflowDomainError {
  readonly code = 'UNAUTHORIZED_WORKFLOW_VIEW';
  constructor(userId: string, expenseId: string) {
    super(
      `User ${userId} is not authorized to view workflow for expense ${expenseId}`
    );
  }
}

export class WorkflowStepMismatchError extends ApprovalWorkflowDomainError {
  readonly code = 'WORKFLOW_STEP_MISMATCH';
  constructor(expectedStep: number, actualStep: number) {
    super(`Expected workflow step ${expectedStep}, but current step is ${actualStep}`);
  }
}

export class ApprovalChainInUseError extends ApprovalWorkflowDomainError {
  readonly code = 'APPROVAL_CHAIN_IN_USE';
  constructor(chainId: string) {
    super(`Cannot delete approval chain ${chainId} because it is referenced by existing workflows`);
  }
}
