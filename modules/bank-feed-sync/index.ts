export { registerBankFeedSyncRoutes } from './infrastructure/http/routes/index';

// Domain error types (used by cross-cutting error handlers)
export {
  BankFeedSyncDomainError,
  BankConnectionNotFoundError,
  SyncSessionNotFoundError,
  BankTransactionNotFoundError,
  SyncAlreadyInProgressError,
  BankConnectionAlreadyExistsError,
  BankConnectionExpiredError,
  BankAPIError,
} from './domain/errors/bank-feed-sync.errors';

// Domain enums (safe to share — value objects, not entities)
export { ConnectionStatus } from './domain/enums/connection-status.enum';
export { SyncStatus } from './domain/enums/sync-status.enum';
export { TransactionStatus } from './domain/enums/transaction-status.enum';

