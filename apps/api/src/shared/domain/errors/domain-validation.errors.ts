/**
 * Base class for all domain validation errors.
 * Provides consistent error structure across all modules.
 */
export class DomainValidationError extends Error {
  public readonly code: string;
  public readonly field?: string;

  constructor(message: string, code: string, field?: string) {
    super(message);
    this.name = "DomainValidationError";
    this.code = code;
    this.field = field;
    Object.setPrototypeOf(this, DomainValidationError.prototype);
  }
}

/**
 * Error thrown when a required field is empty or missing.
 */
export class EmptyFieldError extends DomainValidationError {
  constructor(fieldName: string) {
    super(`${fieldName} cannot be empty`, "EMPTY_FIELD", fieldName);
    this.name = "EmptyFieldError";
    Object.setPrototypeOf(this, EmptyFieldError.prototype);
  }
}

/**
 * Error thrown when a field exceeds maximum length.
 */
export class MaxLengthExceededError extends DomainValidationError {
  constructor(fieldName: string, maxLength: number) {
    super(
      `${fieldName} cannot exceed ${maxLength} characters`,
      "MAX_LENGTH_EXCEEDED",
      fieldName,
    );
    this.name = "MaxLengthExceededError";
    Object.setPrototypeOf(this, MaxLengthExceededError.prototype);
  }
}

/**
 * Error thrown when a value has invalid format.
 */
export class InvalidFormatError extends DomainValidationError {
  constructor(fieldName: string, expectedFormat?: string) {
    super(
      expectedFormat
        ? `${fieldName} has invalid format. Expected: ${expectedFormat}`
        : `Invalid ${fieldName} format`,
      "INVALID_FORMAT",
      fieldName,
    );
    this.name = "InvalidFormatError";
    Object.setPrototypeOf(this, InvalidFormatError.prototype);
  }
}

/**
 * Error thrown when a numeric value is out of valid range.
 */
export class ValueOutOfRangeError extends DomainValidationError {
  constructor(fieldName: string, message: string) {
    super(message, "VALUE_OUT_OF_RANGE", fieldName);
    this.name = "ValueOutOfRangeError";
    Object.setPrototypeOf(this, ValueOutOfRangeError.prototype);
  }
}

/**
 * Error thrown when an operation is not allowed in the current state.
 */
export class InvalidStateTransitionError extends DomainValidationError {
  constructor(
    entityType: string,
    currentState: string,
    attemptedAction: string,
  ) {
    super(
      `Cannot ${attemptedAction} ${entityType} in ${currentState} state`,
      "INVALID_STATE_TRANSITION",
    );
    this.name = "InvalidStateTransitionError";
    Object.setPrototypeOf(this, InvalidStateTransitionError.prototype);
  }
}

/**
 * Error thrown when currency mismatch occurs in money operations.
 */
export class CurrencyMismatchError extends DomainValidationError {
  constructor(operation: string) {
    super(
      `Cannot ${operation} money with different currencies`,
      "CURRENCY_MISMATCH",
    );
    this.name = "CurrencyMismatchError";
    Object.setPrototypeOf(this, CurrencyMismatchError.prototype);
  }
}

/**
 * Error thrown when an ID value object receives invalid format.
 */
export class InvalidIdFormatError extends DomainValidationError {
  constructor(idType: string, value: string) {
    super(`Invalid ${idType} format: ${value}`, "INVALID_ID_FORMAT");
    this.name = "InvalidIdFormatError";
    Object.setPrototypeOf(this, InvalidIdFormatError.prototype);
  }
}
