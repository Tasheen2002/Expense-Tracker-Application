// Base class for all approval workflow-related errors
export class ApprovalWorkflowDomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ApprovalChainNotFoundError extends ApprovalWorkflowDomainError {
  constructor(chainId: string) {
    super(
      `Approval chain with ID ${chainId} not found`,
      'APPROVAL_CHAIN_NOT_FOUND',
      404
    );
  }
}

export class ApprovalStepNotFoundError extends ApprovalWorkflowDomainError {
  constructor(stepId: string) {
    super(
      `Approval step with ID ${stepId} not found`,
      'APPROVAL_STEP_NOT_FOUND',
      404
    );
  }
}

export class InvalidApprovalTransitionError extends ApprovalWorkflowDomainError {
  constructor(from: string, to: string) {
    super(
      `Invalid approval transition from ${from} to ${to}`,
      'INVALID_APPROVAL_TRANSITION',
      400
    );
  }
}

export class UnauthorizedApproverError extends ApprovalWorkflowDomainError {
  constructor(userId: string, stepId: string) {
    super(
      `User ${userId} is not authorized to approve step ${stepId}`,
      'UNAUTHORIZED_APPROVER',
      403
    );
  }
}

export class ApprovalAlreadyProcessedError extends ApprovalWorkflowDomainError {
  constructor(stepId: string) {
    super(
      `Approval step ${stepId} has already been processed`,
      'APPROVAL_ALREADY_PROCESSED',
      409
    );
  }
}

export class InvalidDelegationError extends ApprovalWorkflowDomainError {
  constructor(message: string) {
    super(
      message,
      'INVALID_DELEGATION',
      400
    );
  }
}

export class WorkflowNotFoundError extends ApprovalWorkflowDomainError {
  constructor(expenseId: string) {
    super(
      `Workflow for expense ${expenseId} not found`,
      'WORKFLOW_NOT_FOUND',
      404
    );
  }
}

export class WorkflowAlreadyExistsError extends ApprovalWorkflowDomainError {
  constructor(expenseId: string) {
    super(
      `Workflow for expense ${expenseId} already exists`,
      'WORKFLOW_ALREADY_EXISTS',
      409
    );
  }
}

export class NoMatchingApprovalChainError extends ApprovalWorkflowDomainError {
  constructor(workspaceId: string, amount: number) {
    super(
      `No applicable approval chain found for expense amount ${amount} in workspace ${workspaceId}`,
      'NO_MATCHING_APPROVAL_CHAIN',
      400
    );
  }
}

export class SelfApprovalNotAllowedError extends ApprovalWorkflowDomainError {
  constructor(userId: string) {
    super(
      `User ${userId} cannot be in their own approval chain (self-approval is not allowed for fraud prevention)`,
      'SELF_APPROVAL_NOT_ALLOWED',
      403
    );
  }
}

export class WorkflowAlreadyCompletedError extends ApprovalWorkflowDomainError {
  constructor(expenseId: string, status: string) {
    super(
      `Workflow for expense ${expenseId} is already completed with status: ${status}`,
      'WORKFLOW_ALREADY_COMPLETED',
      409
    );
  }
}

export class WorkflowStepNotFoundError extends ApprovalWorkflowDomainError {
  constructor(stepNumber: number) {
    super(
      `Step ${stepNumber} not found in workflow`,
      'WORKFLOW_STEP_NOT_FOUND',
      404
    );
  }
}

export class CurrentStepNotFoundError extends ApprovalWorkflowDomainError {
  constructor(expenseId: string) {
    super(
      `No current step found in workflow for expense ${expenseId}`,
      'CURRENT_STEP_NOT_FOUND',
      404
    );
  }
}
