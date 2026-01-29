import { DomainError } from "../../../../apps/api/src/shared/domain/domain-error";

/**
 * Base error class for Budget Management module
 */
export class BudgetManagementError extends DomainError {
  constructor(
    message: string,
    public readonly code: string,
    statusCode: number = 400,
  ) {
    super(message, statusCode);
  }
}

/**
 * Budget-related errors
 */
export class BudgetNotFoundError extends BudgetManagementError {
  constructor(budgetId: string, workspaceId?: string) {
    const message = workspaceId
      ? `Budget with ID ${budgetId} not found in workspace ${workspaceId}`
      : `Budget with ID ${budgetId} not found`;
    super(message, "BUDGET_NOT_FOUND", 404);
  }
}

export class BudgetAlreadyExistsError extends BudgetManagementError {
  constructor(name: string, workspaceId: string) {
    super(
      `Budget with name '${name}' already exists in workspace ${workspaceId}`,
      "BUDGET_ALREADY_EXISTS",
      409,
    );
  }
}

export class InvalidBudgetPeriodError extends BudgetManagementError {
  constructor(reason: string) {
    super(`Invalid budget period: ${reason}`, "INVALID_BUDGET_PERIOD", 400);
  }
}

export class InvalidBudgetStatusError extends BudgetManagementError {
  constructor(from: string, to: string) {
    super(
      `Cannot transition budget status from ${from} to ${to}`,
      "INVALID_BUDGET_STATUS",
      400,
    );
  }
}

export class BudgetExceededError extends BudgetManagementError {
  constructor(budgetId: string, allocated: number, spent: number) {
    super(
      `Budget ${budgetId} has been exceeded. Allocated: ${allocated}, Spent: ${spent}`,
      "BUDGET_EXCEEDED",
      400,
    );
  }
}

/**
 * Budget Allocation errors
 */
export class AllocationNotFoundError extends BudgetManagementError {
  constructor(allocationId: string) {
    super(
      `Budget allocation with ID ${allocationId} not found`,
      "ALLOCATION_NOT_FOUND",
      404,
    );
  }
}

export class AllocationAlreadyExistsError extends BudgetManagementError {
  constructor(budgetId: string, categoryId: string) {
    super(
      `Budget ${budgetId} already has an allocation for category ${categoryId}`,
      "ALLOCATION_ALREADY_EXISTS",
      409,
    );
  }
}

export class InvalidAllocationAmountError extends BudgetManagementError {
  constructor(amount: number, available: number) {
    super(
      `Allocation amount ${amount} exceeds available budget ${available}`,
      "INVALID_ALLOCATION_AMOUNT",
      400,
    );
  }
}

export class AllocationExceededError extends BudgetManagementError {
  constructor(allocationId: string, allocated: number, spent: number) {
    super(
      `Allocation ${allocationId} has been exceeded. Allocated: ${allocated}, Spent: ${spent}`,
      "ALLOCATION_EXCEEDED",
      400,
    );
  }
}

/**
 * Budget Alert errors
 */
export class AlertNotFoundError extends BudgetManagementError {
  constructor(alertId: string) {
    super(`Budget alert with ID ${alertId} not found`, "ALERT_NOT_FOUND", 404);
  }
}

/**
 * Spending Limit errors
 */
export class SpendingLimitNotFoundError extends BudgetManagementError {
  constructor(limitId: string) {
    super(
      `Spending limit with ID ${limitId} not found`,
      "SPENDING_LIMIT_NOT_FOUND",
      404,
    );
  }
}

export class SpendingLimitExceededError extends BudgetManagementError {
  constructor(limitAmount: number, currentSpending: number) {
    super(
      `Spending limit ${limitAmount} has been exceeded. Current spending: ${currentSpending}`,
      "SPENDING_LIMIT_EXCEEDED",
      400,
    );
  }
}

export class SpendingLimitAlreadyExistsError extends BudgetManagementError {
  constructor(scope: string) {
    super(
      `A spending limit already exists for ${scope}`,
      "SPENDING_LIMIT_ALREADY_EXISTS",
      409,
    );
  }
}

/**
 * Authorization errors
 */
export class UnauthorizedBudgetAccessError extends BudgetManagementError {
  constructor(operation: string = "access") {
    super(
      `Unauthorized to ${operation} this budget`,
      "UNAUTHORIZED_BUDGET_ACCESS",
      403,
    );
  }
}
