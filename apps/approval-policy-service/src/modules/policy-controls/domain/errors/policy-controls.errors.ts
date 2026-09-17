import { PureDomainError } from '../../../../shared/errors/pure-domain-error';

/**
 * Base class for all policy-controls domain errors
 */
export abstract class PolicyControlsDomainError extends PureDomainError {}

// ============================================
// Policy Errors
// ============================================

export class PolicyNotFoundError extends PolicyControlsDomainError {
  readonly code = 'POLICY_NOT_FOUND';
  constructor(policyId: string) {
    super(`Policy with ID ${policyId} not found`);
  }
}

export class PolicyNameAlreadyExistsError extends PolicyControlsDomainError {
  readonly code = 'POLICY_NAME_EXISTS';
  constructor(name: string, workspaceId: string) {
    super(
      `Policy with name "${name}" already exists in workspace ${workspaceId}`
    );
  }
}

export class InvalidPolicyConfigurationError extends PolicyControlsDomainError {
  readonly code = 'INVALID_POLICY_CONFIGURATION';
  constructor(message: string) {
    super(message);
  }
}

export class PolicyNameRequiredError extends PolicyControlsDomainError {
  readonly code = 'POLICY_NAME_REQUIRED';
  constructor() {
    super('Policy name is required');
  }
}

export class PolicyNameTooLongError extends PolicyControlsDomainError {
  readonly code = 'POLICY_NAME_TOO_LONG';
  constructor(maxLength: number) {
    super(`Policy name cannot exceed ${maxLength} characters`);
  }
}

export class PolicyDescriptionTooLongError extends PolicyControlsDomainError {
  readonly code = 'POLICY_DESCRIPTION_TOO_LONG';
  constructor(maxLength: number) {
    super(`Policy description cannot exceed ${maxLength} characters`);
  }
}

export class InvalidThresholdError extends PolicyControlsDomainError {
  readonly code = 'INVALID_THRESHOLD';
  constructor(message: string) {
    super(message);
  }
}

export class PolicyAlreadyActiveError extends PolicyControlsDomainError {
  readonly code = 'POLICY_ALREADY_ACTIVE';
  constructor(policyId: string) {
    super(`Policy ${policyId} is already active`);
  }
}

export class PolicyAlreadyInactiveError extends PolicyControlsDomainError {
  readonly code = 'POLICY_ALREADY_INACTIVE';
  constructor(policyId: string) {
    super(`Policy ${policyId} is already inactive`);
  }
}

export class PolicyInUseError extends PolicyControlsDomainError {
  readonly code = 'POLICY_IN_USE';
  constructor(message: string) {
    super(message);
  }
}

// ============================================
// Violation Errors
// ============================================

export class ViolationNotFoundError extends PolicyControlsDomainError {
  readonly code = 'VIOLATION_NOT_FOUND';
  constructor(violationId: string) {
    super(`Violation with ID ${violationId} not found`);
  }
}

export class ViolationAlreadyResolvedError extends PolicyControlsDomainError {
  readonly code = 'VIOLATION_ALREADY_RESOLVED';
  constructor(violationId: string) {
    super(`Violation ${violationId} has already been resolved`);
  }
}

export class InvalidViolationTransitionError extends PolicyControlsDomainError {
  readonly code = 'INVALID_VIOLATION_TRANSITION';
  constructor(from: string, to: string) {
    super(`Invalid violation status transition from ${from} to ${to}`);
  }
}

export class UnauthorizedViolationActionError extends PolicyControlsDomainError {
  readonly code = 'UNAUTHORIZED_VIOLATION_ACTION';
  constructor(userId: string, action: string) {
    super(`User ${userId} is not authorized to ${action} this violation`);
  }
}

export class InvalidExemptionForViolationError extends PolicyControlsDomainError {
  readonly code = 'INVALID_EXEMPTION_FOR_VIOLATION';
  constructor(message: string) {
    super(message);
  }
}

// ============================================
// Exemption Errors
// ============================================

export class ExemptionNotFoundError extends PolicyControlsDomainError {
  readonly code = 'EXEMPTION_NOT_FOUND';
  constructor(exemptionId: string) {
    super(`Exemption with ID ${exemptionId} not found`);
  }
}

export class ExemptionAlreadyProcessedError extends PolicyControlsDomainError {
  readonly code = 'EXEMPTION_ALREADY_PROCESSED';
  constructor(exemptionId: string) {
    super(`Exemption ${exemptionId} has already been processed`);
  }
}

export class ExemptionExpiredError extends PolicyControlsDomainError {
  readonly code = 'EXEMPTION_EXPIRED';
  constructor(exemptionId: string) {
    super(`Exemption ${exemptionId} has expired`);
  }
}

export class InvalidExemptionDateRangeError extends PolicyControlsDomainError {
  readonly code = 'INVALID_EXEMPTION_DATE_RANGE';
  constructor() {
    super('End date must be after start date');
  }
}

export class UnauthorizedExemptionApprovalError extends PolicyControlsDomainError {
  readonly code = 'UNAUTHORIZED_EXEMPTION_APPROVAL';
  constructor(userId: string) {
    super(`User ${userId} is not authorized to approve exemptions`);
  }
}

// ============================================
// Policy Evaluation Errors
// ============================================

export class ExpenseBlockedByPolicyError extends PolicyControlsDomainError {
  readonly code = 'EXPENSE_BLOCKED_BY_POLICY';
  constructor(expenseId: string, policyName: string) {
    super(`Expense ${expenseId} is blocked by policy "${policyName}"`);
  }
}

export class PolicyEvaluationError extends PolicyControlsDomainError {
  readonly code = 'POLICY_EVALUATION_ERROR';
  constructor(message: string) {
    super(message);
  }
}

// ============================================
// Invariant & Boundary Errors
// ============================================

export class InvalidPriorityError extends PolicyControlsDomainError {
  readonly code = 'INVALID_PRIORITY';
  constructor(message: string) {
    super(message);
  }
}

export class ExemptionDurationExceededError extends PolicyControlsDomainError {
  readonly code = 'EXEMPTION_DURATION_EXCEEDED';
  constructor(maxDays: number) {
    super(`Exemption duration cannot exceed ${maxDays} days`);
  }
}

export class ExemptionReasonLengthError extends PolicyControlsDomainError {
  readonly code = 'EXEMPTION_REASON_LENGTH_INVALID';
  constructor(message: string) {
    super(message);
  }
}

export class ViolationNoteLengthError extends PolicyControlsDomainError {
  readonly code = 'VIOLATION_NOTE_LENGTH_INVALID';
  constructor(message: string) {
    super(message);
  }
}

export class InvalidScopeError extends PolicyControlsDomainError {
  readonly code = 'INVALID_POLICY_SCOPE';
  constructor(message: string) {
    super(message);
  }
}
