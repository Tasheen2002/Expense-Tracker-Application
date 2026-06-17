import { DomainError } from '@core/domain/domain-error';

export class BankFeedSyncDomainError extends DomainError {
  constructor(message: string, code: string = 'BANK_FEED_SYNC_ERROR', statusCode: number = 500) {
    super(message, code, statusCode);
  }
}

// ============================================================================
// Bank Connection Errors
// ============================================================================

export class BankConnectionNotFoundError extends BankFeedSyncDomainError {
  constructor(connectionId: string) {
    super(
      `Bank connection with ID ${connectionId} not found`,
      'BANK_CONNECTION_NOT_FOUND',
      404
    );
  }
}

export class BankConnectionAlreadyExistsError extends BankFeedSyncDomainError {
  constructor(institutionId: string, accountId: string) {
    super(
      `Bank connection already exists for institution ${institutionId} and account ${accountId}`,
      'BANK_CONNECTION_ALREADY_EXISTS',
      409
    );
  }
}

export class BankConnectionExpiredError extends BankFeedSyncDomainError {
  constructor(connectionId: string) {
    super(
      `Bank connection ${connectionId} has expired. Please re-authorize.`,
      'BANK_CONNECTION_EXPIRED',
      401
    );
  }
}

export class InvalidBankTokenError extends BankFeedSyncDomainError {
  constructor(message: string = 'Invalid or expired bank access token') {
    super(message, 'INVALID_BANK_TOKEN', 401);
  }
}

// ============================================================================
// Sync Session Errors
// ============================================================================

export class SyncSessionNotFoundError extends BankFeedSyncDomainError {
  constructor(sessionId: string) {
    super(
      `Sync session with ID ${sessionId} not found`,
      'SYNC_SESSION_NOT_FOUND',
      404
    );
  }
}

export class SyncAlreadyInProgressError extends BankFeedSyncDomainError {
  constructor(connectionId: string) {
    super(
      `Sync already in progress for connection ${connectionId}`,
      'SYNC_ALREADY_IN_PROGRESS',
      409
    );
  }
}

export class SyncTooFrequentError extends BankFeedSyncDomainError {
  constructor(minutesUntilNext: number) {
    super(
      `Sync too frequent. Please wait ${minutesUntilNext} minutes before next sync.`,
      'SYNC_TOO_FREQUENT',
      429
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
      'BANK_TRANSACTION_NOT_FOUND',
      404
    );
  }
}

export class DuplicateTransactionError extends BankFeedSyncDomainError {
  constructor(externalId: string) {
    super(
      `Transaction with external ID ${externalId} already exists`,
      'DUPLICATE_TRANSACTION',
      409
    );
  }
}

// ============================================================================
// Bank API Errors
// ============================================================================

export class BankAPIError extends BankFeedSyncDomainError {
  constructor(
    message: string,
    public readonly provider: string
  ) {
    super(`Bank API Error (${provider}): ${message}`, 'BANK_API_ERROR', 502);
  }
}

export class BankAPIRateLimitError extends BankFeedSyncDomainError {
  constructor(retryAfterSeconds?: number) {
    const message = retryAfterSeconds
      ? `Bank API rate limit exceeded. Retry after ${retryAfterSeconds} seconds.`
      : 'Bank API rate limit exceeded.';
    super(message, 'BANK_API_RATE_LIMIT', 429);
  }
}

export class BankAuthorizationRequiredError extends BankFeedSyncDomainError {
  constructor(authUrl: string) {
    super(
      `Bank authorization required. Please visit: ${authUrl}`,
      'BANK_AUTHORIZATION_REQUIRED',
      403
    );
  }
}

// ============================================================================
// Transaction Processing Errors
// ============================================================================

export class MissingExpenseIdError extends BankFeedSyncDomainError {
  constructor(action: string) {
    super(
      `expenseId is required for ${action} action`,
      'MISSING_EXPENSE_ID',
      400
    );
  }
}

export class InvalidTransactionActionError extends BankFeedSyncDomainError {
  constructor(action: string) {
    super(
      `Invalid transaction action: ${action}`,
      'INVALID_TRANSACTION_ACTION',
      400
    );
  }
}
