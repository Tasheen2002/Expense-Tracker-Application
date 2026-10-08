/**
 * Retry with exponential backoff and jitter for transient failure recovery.
 */

export interface RetryOptions {
  /** Maximum number of retry attempts. Default: 3 */
  maxRetries?: number;
  /** Base delay in milliseconds before first retry. Default: 1000 (1s) */
  baseDelayMs?: number;
  /** Maximum delay cap in milliseconds. Default: 30000 (30s) */
  maxDelayMs?: number;
  /** Optional name for logging. */
  name?: string;
  /** Optional error classifier. False stops retries without changing the error. */
  shouldRetry?: (error: unknown) => boolean;
}

/**
 * Execute an async function with exponential backoff retry.
 * Throws the last error if all retries are exhausted.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 1000;
  const maxDelayMs = options?.maxDelayMs ?? 30_000;
  const name = options?.name ?? 'Retry';
  if (!Number.isSafeInteger(maxRetries) || maxRetries < 0 ||
      !Number.isSafeInteger(baseDelayMs) || baseDelayMs < 0 ||
      !Number.isSafeInteger(maxDelayMs) || maxDelayMs < 0 || maxDelayMs > 2_147_483_647) {
    throw new RangeError('Retry count and delays must be nonnegative integers within the timer range');
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      if (attempt === maxRetries || options?.shouldRetry?.(error) === false) {
        break;
      }

      // Exponential backoff with full jitter: delay = random(0, min(maxDelay, base * 2^attempt))
      const exponentialDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
      const jitteredDelay = Math.random() * exponentialDelay;

      console.warn(
        `[${name}] Attempt ${attempt + 1}/${maxRetries + 1} failed: ${error instanceof Error ? error.message : String(error)}. ` +
        `Retrying in ${Math.round(jitteredDelay)}ms...`
      );

      await sleep(jitteredDelay);
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
