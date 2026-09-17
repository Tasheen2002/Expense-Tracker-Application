/**
 * Base transport-neutral domain error for approval-policy-service.
 *
 * Adheres strictly to DDD: domain errors represent domain/business invariant failures
 * and must never leak HTTP transport concerns (such as statusCode).
 *
 * Mapping to HTTP responses belongs exclusively in the HTTP layer (e.g. error.ts plugin).
 */
export abstract class PureDomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, new.target);
    }
  }

  public toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
    };
  }
}
