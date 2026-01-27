export class ApprovalChainNotFoundError extends Error {
  statusCode = 404

  constructor(chainId: string) {
    super(`Approval chain with ID ${chainId} not found`)
    this.name = 'ApprovalChainNotFoundError'
  }
}

export class ApprovalStepNotFoundError extends Error {
  statusCode = 404

  constructor(stepId: string) {
    super(`Approval step with ID ${stepId} not found`)
    this.name = 'ApprovalStepNotFoundError'
  }
}

export class InvalidApprovalTransitionError extends Error {
  statusCode = 400

  constructor(from: string, to: string) {
    super(`Invalid approval transition from ${from} to ${to}`)
    this.name = 'InvalidApprovalTransitionError'
  }
}

export class UnauthorizedApproverError extends Error {
  statusCode = 403

  constructor(userId: string, stepId: string) {
    super(`User ${userId} is not authorized to approve step ${stepId}`)
    this.name = 'UnauthorizedApproverError'
  }
}

export class ApprovalAlreadyProcessedError extends Error {
  statusCode = 409

  constructor(stepId: string) {
    super(`Approval step ${stepId} has already been processed`)
    this.name = 'ApprovalAlreadyProcessedError'
  }
}

export class InvalidDelegationError extends Error {
  statusCode = 400

  constructor(message: string) {
    super(message)
    this.name = 'InvalidDelegationError'
  }
}

export class WorkflowNotFoundError extends Error {
  statusCode = 404

  constructor(expenseId: string) {
    super(`Workflow for expense ${expenseId} not found`)
    this.name = 'WorkflowNotFoundError'
  }
}

export class WorkflowAlreadyExistsError extends Error {
  statusCode = 409

  constructor(expenseId: string) {
    super(`Workflow for expense ${expenseId} already exists`)
    this.name = 'WorkflowAlreadyExistsError'
  }
}

export class NoMatchingApprovalChainError extends Error {
  statusCode = 400

  constructor(workspaceId: string, amount: number) {
    super(`No applicable approval chain found for expense amount ${amount} in workspace ${workspaceId}`)
    this.name = 'NoMatchingApprovalChainError'
  }
}

export class SelfApprovalNotAllowedError extends Error {
  statusCode = 403

  constructor(userId: string) {
    super(`User ${userId} cannot be in their own approval chain (self-approval is not allowed for fraud prevention)`)
    this.name = 'SelfApprovalNotAllowedError'
  }
}

export class WorkflowAlreadyCompletedError extends Error {
  statusCode = 409

  constructor(expenseId: string, status: string) {
    super(`Workflow for expense ${expenseId} is already completed with status: ${status}`)
    this.name = 'WorkflowAlreadyCompletedError'
  }
}

export class WorkflowStepNotFoundError extends Error {
  statusCode = 404

  constructor(stepNumber: number) {
    super(`Step ${stepNumber} not found in workflow`)
    this.name = 'WorkflowStepNotFoundError'
  }
}

export class CurrentStepNotFoundError extends Error {
  statusCode = 404

  constructor(expenseId: string) {
    super(`No current step found in workflow for expense ${expenseId}`)
    this.name = 'CurrentStepNotFoundError'
  }
}
