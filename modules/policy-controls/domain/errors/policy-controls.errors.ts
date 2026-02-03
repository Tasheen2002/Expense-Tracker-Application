/**
 * Base class for all policy-controls domain errors
 */
export class PolicyControlsDomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

// ============================================
// Policy Errors
// ============================================

export class PolicyNotFoundError extends PolicyControlsDomainError {
  constructor(policyId: string) {
    super(`Policy with ID ${policyId} not found`, "POLICY_NOT_FOUND", 404);
  }
}

export class PolicyNameAlreadyExistsError extends PolicyControlsDomainError {
  constructor(name: string, workspaceId: string) {
    super(
      `Policy with name "${name}" already exists in workspace ${workspaceId}`,
      "POLICY_NAME_EXISTS",
      409,
    );
  }
}

export class InvalidPolicyConfigurationError extends PolicyControlsDomainError {
  constructor(message: string) {
    super(message, "INVALID_POLICY_CONFIGURATION", 400);
  }
}

export class PolicyNameRequiredError extends PolicyControlsDomainError {
  constructor() {
    super("Policy name is required", "POLICY_NAME_REQUIRED", 400);
  }
}

export class PolicyNameTooLongError extends PolicyControlsDomainError {
  constructor(maxLength: number) {
    super(
      `Policy name cannot exceed ${maxLength} characters`,
      "POLICY_NAME_TOO_LONG",
      400,
    );
  }
}

export class PolicyDescriptionTooLongError extends PolicyControlsDomainError {
  constructor(maxLength: number) {
    super(
      `Policy description cannot exceed ${maxLength} characters`,
      "POLICY_DESCRIPTION_TOO_LONG",
      400,
    );
  }
}

export class InvalidThresholdError extends PolicyControlsDomainError {
  constructor(message: string) {
    super(message, "INVALID_THRESHOLD", 400);
  }
}

export class PolicyAlreadyActiveError extends PolicyControlsDomainError {
  constructor(policyId: string) {
    super(`Policy ${policyId} is already active`, "POLICY_ALREADY_ACTIVE", 409);
  }
}

export class PolicyAlreadyInactiveError extends PolicyControlsDomainError {
  constructor(policyId: string) {
    super(
      `Policy ${policyId} is already inactive`,
      "POLICY_ALREADY_INACTIVE",
      409,
    );
  }
}

// ============================================
// Violation Errors
// ============================================

export class ViolationNotFoundError extends PolicyControlsDomainError {
  constructor(violationId: string) {
    super(
      `Violation with ID ${violationId} not found`,
      "VIOLATION_NOT_FOUND",
      404,
    );
  }
}

export class ViolationAlreadyResolvedError extends PolicyControlsDomainError {
  constructor(violationId: string) {
    super(
      `Violation ${violationId} has already been resolved`,
      "VIOLATION_ALREADY_RESOLVED",
      409,
    );
  }
}

export class InvalidViolationTransitionError extends PolicyControlsDomainError {
  constructor(from: string, to: string) {
    super(
      `Invalid violation status transition from ${from} to ${to}`,
      "INVALID_VIOLATION_TRANSITION",
      400,
    );
  }
}

export class UnauthorizedViolationActionError extends PolicyControlsDomainError {
  constructor(userId: string, action: string) {
    super(
      `User ${userId} is not authorized to ${action} this violation`,
      "UNAUTHORIZED_VIOLATION_ACTION",
      403,
    );
  }
}

// ============================================
// Exemption Errors
// ============================================

export class ExemptionNotFoundError extends PolicyControlsDomainError {
  constructor(exemptionId: string) {
    super(
      `Exemption with ID ${exemptionId} not found`,
      "EXEMPTION_NOT_FOUND",
      404,
    );
  }
}

export class ExemptionAlreadyProcessedError extends PolicyControlsDomainError {
  constructor(exemptionId: string) {
    super(
      `Exemption ${exemptionId} has already been processed`,
      "EXEMPTION_ALREADY_PROCESSED",
      409,
    );
  }
}

export class ExemptionExpiredError extends PolicyControlsDomainError {
  constructor(exemptionId: string) {
    super(`Exemption ${exemptionId} has expired`, "EXEMPTION_EXPIRED", 400);
  }
}

export class InvalidExemptionDateRangeError extends PolicyControlsDomainError {
  constructor() {
    super(
      "End date must be after start date",
      "INVALID_EXEMPTION_DATE_RANGE",
      400,
    );
  }
}

export class UnauthorizedExemptionApprovalError extends PolicyControlsDomainError {
  constructor(userId: string) {
    super(
      `User ${userId} is not authorized to approve exemptions`,
      "UNAUTHORIZED_EXEMPTION_APPROVAL",
      403,
    );
  }
}

// ============================================
// Policy Evaluation Errors
// ============================================

export class ExpenseBlockedByPolicyError extends PolicyControlsDomainError {
  constructor(expenseId: string, policyName: string) {
    super(
      `Expense ${expenseId} is blocked by policy "${policyName}"`,
      "EXPENSE_BLOCKED_BY_POLICY",
      403,
    );
  }
}

export class PolicyEvaluationError extends PolicyControlsDomainError {
  constructor(message: string) {
    super(message, "POLICY_EVALUATION_ERROR", 500);
  }
}
