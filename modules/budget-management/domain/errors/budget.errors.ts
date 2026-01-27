/**
 * Base error class for Budget Management module
 */
export abstract class BudgetManagementError extends Error {
  abstract readonly statusCode: number

  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Budget-related errors
 */
export class BudgetNotFoundError extends BudgetManagementError {
  readonly statusCode = 404

  constructor(budgetId: string, workspaceId?: string) {
    const message = workspaceId
      ? `Budget with ID ${budgetId} not found in workspace ${workspaceId}`
      : `Budget with ID ${budgetId} not found`
    super(message)
  }
}

export class BudgetAlreadyExistsError extends BudgetManagementError {
  readonly statusCode = 409

  constructor(name: string, workspaceId: string) {
    super(`Budget with name '${name}' already exists in workspace ${workspaceId}`)
  }
}

export class InvalidBudgetPeriodError extends BudgetManagementError {
  readonly statusCode = 400

  constructor(reason: string) {
    super(`Invalid budget period: ${reason}`)
  }
}

export class InvalidBudgetStatusError extends BudgetManagementError {
  readonly statusCode = 400

  constructor(from: string, to: string) {
    super(`Cannot transition budget status from ${from} to ${to}`)
  }
}

export class BudgetExceededError extends BudgetManagementError {
  readonly statusCode = 400

  constructor(budgetId: string, allocated: number, spent: number) {
    super(
      `Budget ${budgetId} has been exceeded. Allocated: ${allocated}, Spent: ${spent}`
    )
  }
}

/**
 * Budget Allocation errors
 */
export class AllocationNotFoundError extends BudgetManagementError {
  readonly statusCode = 404

  constructor(allocationId: string) {
    super(`Budget allocation with ID ${allocationId} not found`)
  }
}

export class AllocationAlreadyExistsError extends BudgetManagementError {
  readonly statusCode = 409

  constructor(budgetId: string, categoryId: string) {
    super(`Budget ${budgetId} already has an allocation for category ${categoryId}`)
  }
}

export class InvalidAllocationAmountError extends BudgetManagementError {
  readonly statusCode = 400

  constructor(amount: number, available: number) {
    super(
      `Allocation amount ${amount} exceeds available budget ${available}`
    )
  }
}

export class AllocationExceededError extends BudgetManagementError {
  readonly statusCode = 400

  constructor(allocationId: string, allocated: number, spent: number) {
    super(
      `Allocation ${allocationId} has been exceeded. Allocated: ${allocated}, Spent: ${spent}`
    )
  }
}

/**
 * Budget Alert errors
 */
export class AlertNotFoundError extends BudgetManagementError {
  readonly statusCode = 404

  constructor(alertId: string) {
    super(`Budget alert with ID ${alertId} not found`)
  }
}

/**
 * Spending Limit errors
 */
export class SpendingLimitNotFoundError extends BudgetManagementError {
  readonly statusCode = 404

  constructor(limitId: string) {
    super(`Spending limit with ID ${limitId} not found`)
  }
}

export class SpendingLimitExceededError extends BudgetManagementError {
  readonly statusCode = 400

  constructor(limitAmount: number, currentSpending: number) {
    super(
      `Spending limit ${limitAmount} has been exceeded. Current spending: ${currentSpending}`
    )
  }
}

export class SpendingLimitAlreadyExistsError extends BudgetManagementError {
  readonly statusCode = 409

  constructor(scope: string) {
    super(`A spending limit already exists for ${scope}`)
  }
}

/**
 * Authorization errors
 */
export class UnauthorizedBudgetAccessError extends BudgetManagementError {
  readonly statusCode = 403

  constructor(operation: string = 'access') {
    super(`Unauthorized to ${operation} this budget`)
  }
}
