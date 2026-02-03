/**
 * Bank Feed Sync Module Constants
 */

// Token expiration (90 days typical for bank APIs)
export const ACCESS_TOKEN_EXPIRY_DAYS = 90;

// Sync intervals
export const MIN_SYNC_INTERVAL_MINUTES = 15;
export const DEFAULT_SYNC_INTERVAL_HOURS = 24;

// Transaction lookback period (days)
export const DEFAULT_LOOKBACK_DAYS = 30;
export const MAX_LOOKBACK_DAYS = 730; // 2 years

// Batch sizes
export const TRANSACTION_BATCH_SIZE = 100;
export const MAX_TRANSACTIONS_PER_SYNC = 1000;

// Duplicate detection threshold (minutes)
export const DUPLICATE_TIME_THRESHOLD_MINUTES = 5;

// Retry configuration
export const MAX_SYNC_RETRIES = 3;
export const SYNC_RETRY_DELAY_MS = 5000;
