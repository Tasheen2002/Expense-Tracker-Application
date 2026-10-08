/**
 * Timeout wrapper for async operations.
 * Rejects with a TimeoutError if the operation doesn't complete within the specified duration.
 */

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Wraps an async function with a timeout.
 * @param fn - The async function to execute.
 * @param timeoutMs - Maximum time to wait in milliseconds.
 * @param name - Optional name for error messages.
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  name?: string
): Promise<T> {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2_147_483_647) {
    throw new RangeError('Timeout must be a positive integer within the timer range');
  }
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new TimeoutError(
          `[${name ?? 'Timeout'}] Operation timed out after ${timeoutMs}ms`
        )
      );
    }, timeoutMs);

    Promise.resolve().then(fn)
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}
