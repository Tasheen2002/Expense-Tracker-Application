/**
 * Base error class for Bank Feed Sync domain
 */
export class BankFeedSyncDomainError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code?: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ============================================================================
// Bank Connection Errors
// ============================================================================

export class BankConnectionNotFoundError extends BankFeedSyncDomainError {
  constructor(connectionId: string) {
    super(
      `Bank connection with ID ${connectionId} not found`,
      404,
      "BANK_CONNECTION_NOT_FOUND",
    );
  }
}

export class BankConnectionAlreadyExistsError extends BankFeedSyncDomainError {
  constructor(institutionId: string, accountId: string) {
    super(
      `Bank connection already exists for institution ${institutionId} and account ${accountId}`,
      409,
      "BANK_CONNECTION_ALREADY_EXISTS",
    );
  }
}

export class BankConnectionExpiredError extends BankFeedSyncDomainError {
  constructor(connectionId: string) {
    super(
      `Bank connection ${connectionId} has expired. Please re-authorize.`,
      401,
      "BANK_CONNECTION_EXPIRED",
    );
  }
}

export class InvalidBankTokenError extends BankFeedSyncDomainError {
  constructor(message: string = "Invalid or expired bank access token") {
    super(message, 401, "INVALID_BANK_TOKEN");
  }
}

// ============================================================================
// Sync Session Errors
// ============================================================================

export class SyncSessionNotFoundError extends BankFeedSyncDomainError {
  constructor(sessionId: string) {
    super(
      `Sync session with ID ${sessionId} not found`,
      404,
      "SYNC_SESSION_NOT_FOUND",
    );
  }
}

export class SyncAlreadyInProgressError extends BankFeedSyncDomainError {
  constructor(connectionId: string) {
    super(
      `Sync already in progress for connection ${connectionId}`,
      409,
      "SYNC_ALREADY_IN_PROGRESS",
    );
  }
}

export class SyncTooFrequentError extends BankFeedSyncDomainError {
  constructor(minutesUntilNext: number) {
    super(
      `Sync too frequent. Please wait ${minutesUntilNext} minutes before next sync.`,
      429,
      "SYNC_TOO_FREQUENT",
    );
  }
}

// ============================================================================
// Bank Transaction Errors
// ============================================================================

export class BankTransactionNotFoundError extends BankFeedSyncDomainError {
  constructor(transactionId: string) {
    super(
      `Bank transaction with ID ${transactionId} not found`,
      404,
      "BANK_TRANSACTION_NOT_FOUND",
    );
  }
}

export class DuplicateTransactionError extends BankFeedSyncDomainError {
  constructor(externalId: string) {
    super(
      `Transaction with external ID ${externalId} already exists`,
      409,
      "DUPLICATE_TRANSACTION",
    );
  }
}

// ============================================================================
// Bank API Errors
// ============================================================================

export class BankAPIError extends BankFeedSyncDomainError {
  constructor(
    message: string,
    public readonly provider: string,
  ) {
    super(`Bank API Error (${provider}): ${message}`, 502, "BANK_API_ERROR");
  }
}

export class BankAPIRateLimitError extends BankFeedSyncDomainError {
  constructor(retryAfterSeconds?: number) {
    const message = retryAfterSeconds
      ? `Bank API rate limit exceeded. Retry after ${retryAfterSeconds} seconds.`
      : "Bank API rate limit exceeded.";
    super(message, 429, "BANK_API_RATE_LIMIT");
  }
}

export class BankAuthorizationRequiredError extends BankFeedSyncDomainError {
  constructor(authUrl: string) {
    super(
      `Bank authorization required. Please visit: ${authUrl}`,
      403,
      "BANK_AUTHORIZATION_REQUIRED",
    );
  }
}
