/**
 * Circuit Breaker implementation for inter-service communication.
 *
 * States:
 *  - CLOSED:    Normal operation — requests pass through.
 *  - OPEN:      Failures exceeded threshold — requests are immediately rejected.
 *  - HALF_OPEN: After the reset timeout, one probe request is allowed through.
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  /** Number of consecutive failures before opening the circuit. Default: 5 */
  failureThreshold?: number;
  /** Milliseconds to wait before transitioning from OPEN to HALF_OPEN. Default: 30000 (30s) */
  resetTimeoutMs?: number;
  /** Optional name for logging. */
  name?: string;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private generation = 0;

  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly name: string;

  constructor(options?: CircuitBreakerOptions) {
    this.failureThreshold = options?.failureThreshold ?? 5;
    this.resetTimeoutMs = options?.resetTimeoutMs ?? 30_000;
    this.name = options?.name ?? 'CircuitBreaker';
    if (!Number.isSafeInteger(this.failureThreshold) || this.failureThreshold <= 0 ||
        !Number.isSafeInteger(this.resetTimeoutMs) || this.resetTimeoutMs <= 0) {
      throw new RangeError('Circuit threshold and reset timeout must be positive integers');
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  /**
   * Execute an async function through the circuit breaker.
   * Throws a CircuitOpenError if the circuit is OPEN and the reset timeout hasn't elapsed.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'HALF_OPEN') {
      throw new CircuitOpenError(`[${this.name}] Recovery probe is already running`);
    }
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        console.log(`[${this.name}] Circuit transitioned to HALF_OPEN — allowing probe request`);
      } else {
        throw new CircuitOpenError(
          `[${this.name}] Circuit is OPEN — rejecting request. Retry after ${this.resetTimeoutMs}ms`
        );
      }
    }

    const generation = this.generation;
    try {
      const result = await fn();
      if (generation === this.generation) this.onSuccess();
      return result;
    } catch (error) {
      if (generation === this.generation) this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      console.log(`[${this.name}] Probe request succeeded — circuit CLOSED`);
    }
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.generation++;
      console.warn(
        `[${this.name}] Failure threshold reached (${this.failureCount}/${this.failureThreshold}) — circuit OPEN`
      );
    }
  }

  /** Reset the circuit breaker to CLOSED state. */
  reset(): void {
    this.generation++;
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }
}

export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitOpenError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
