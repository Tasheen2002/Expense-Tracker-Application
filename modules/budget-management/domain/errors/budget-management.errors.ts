import { DomainError } from "../../../shared/domain/errors/domain-error";

export class InvalidBudgetPeriodError extends DomainError {
  constructor(message: string) {
    super(message, "INVALID_BUDGET_PERIOD");
  }
}

export class InvalidAlertThresholdError extends DomainError {
  constructor(message: string) {
    super(message, "INVALID_ALERT_THRESHOLD");
  }
}

export class InvalidAmountError extends DomainError {
  constructor(message: string) {
    super(message, "INVALID_AMOUNT");
  }
}

export class InvalidCurrencyError extends DomainError {
  constructor(message: string) {
    super(message, "INVALID_CURRENCY");
  }
}

export class BudgetNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Budget with ID ${id} not found`, "BUDGET_NOT_FOUND");
  }
}

export class BudgetAlreadyActiveError extends DomainError {
  constructor(message: string = "Budget is already active") {
    super(message, "BUDGET_ALREADY_ACTIVE");
  }
}

export class InvalidBudgetStatusError extends DomainError {
  constructor(message: string) {
    super(message, "INVALID_BUDGET_STATUS");
  }
}

export class BudgetLimitExceededError extends DomainError {
  constructor(message: string) {
    super(message, "BUDGET_LIMIT_EXCEEDED");
  }
}

export class AllocationLimitExceededError extends DomainError {
  constructor(message: string) {
    super(message, "ALLOCATION_LIMIT_EXCEEDED");
  }
}
