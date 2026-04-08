export abstract class DomainValidationError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly field: string | undefined;
  public readonly name: string;

  constructor(message: string, code: string, field?: string) {
    super(message);
    this.code = code;
    this.field = field;
    this.statusCode = 400;
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class EmptyFieldError extends DomainValidationError {
  constructor(fieldName: string) {
    super(`${fieldName} cannot be empty`, 'EMPTY_FIELD', fieldName);
  }
}

export class InvalidFormatError extends DomainValidationError {
  constructor(fieldName: string, expectedFormat?: string) {
    super(
      expectedFormat
        ? `${fieldName} must be a valid ${expectedFormat}`
        : `${fieldName} has an invalid format`,
      'INVALID_FORMAT',
      fieldName
    );
  }
}

export abstract class DomainError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly name: string;

  constructor(
    message: string,
    codeOrStatusCode?: string | number,
    statusCode?: number
  ) {
    super(message);

    if (typeof codeOrStatusCode === 'string') {
      this.code = codeOrStatusCode;
      this.statusCode = statusCode ?? 400;
    } else {
      this.code = 'DOMAIN_ERROR';
      this.statusCode = codeOrStatusCode ?? 400;
    }

    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  public toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
    };
  }
}
