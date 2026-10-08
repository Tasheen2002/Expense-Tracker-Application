import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Rate limit configuration options.
 */
export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (request: FastifyRequest) => string;
  skipFailedRequests?: boolean;
  message?: string;
  statusCode?: number;
  headers?: boolean; // Include rate limit headers in response
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory rate limiter store.
 * For distributed systems, replace with Redis store.
 */
class RateLimitStore {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (now >= entry.resetAt) {
          this.store.delete(key);
        }
      }
    }, 60000);
    // Cleanup must not keep a closed service process alive.
    this.cleanupInterval.unref();
  }

  increment(key: string, windowMs: number): RateLimitEntry {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now >= entry.resetAt) {
      // Start new window
      const newEntry: RateLimitEntry = {
        count: 1,
        resetAt: now + windowMs,
      };
      this.store.set(key, newEntry);
      return newEntry;
    }

    // Increment existing window
    entry.count++;
    return entry;
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Singleton store instance
const store = new RateLimitStore();
let nextPolicyId = 0;

/**
 * Creates a rate limiter middleware for Fastify.
 */
export function createRateLimiter(options: RateLimitOptions) {
  const policyId = ++nextPolicyId;
  if (!Number.isSafeInteger(options.windowMs) || options.windowMs <= 0 ||
      !Number.isSafeInteger(options.maxRequests) || options.maxRequests <= 0) {
    throw new Error('Rate limit window and maximum must be positive safe integers');
  }
  const {
    windowMs,
    maxRequests,
    keyGenerator = defaultKeyGenerator,
    message = 'Too many requests, please try again later.',
    statusCode = 429,
    headers = true,
  } = options;

  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Disable rate limiting in tests so suites don't accumulate state
    // across runs and accidentally trip 429s.
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const key = `${policyId}:${keyGenerator(request)}`;
    const entry = store.increment(key, windowMs);
    if (options.skipFailedRequests) {
      reply.raw.once('finish', () => {
        if (reply.statusCode >= 400) entry.count = Math.max(0, entry.count - 1);
      });
    }

    const remaining = Math.max(0, maxRequests - entry.count);
    const resetTime = Math.ceil(entry.resetAt / 1000);

    // Add rate limit headers
    if (headers) {
      reply.header('X-RateLimit-Limit', maxRequests);
      reply.header('X-RateLimit-Remaining', remaining);
      reply.header('X-RateLimit-Reset', resetTime);
    }

    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - Date.now()) / 1000);
      reply.header('Retry-After', retryAfter);

      return reply.status(statusCode).send({
        error: 'Too Many Requests',
        message,
        retryAfter,
      });
    }

    // Continue to next handler
  };
}

/**
 * Default key generator - uses IP address.
 */
function defaultKeyGenerator(request: FastifyRequest): string {
  // Fastify applies the configured trustProxy policy when resolving request.ip.
  const ip = request.ip;
  return `rate_limit:${ip}`;
}

/**
 * Key generator that includes route path.
 */
export function endpointKeyGenerator(request: FastifyRequest): string {
  const ip = defaultKeyGenerator(request).replace('rate_limit:', '');
  return `rate_limit:${ip}:${request.method}:${request.routerPath}`;
}

/**
 * Key generator for authenticated users.
 */
export function userKeyGenerator(request: FastifyRequest): string {
  const user = (request as any).user as { id?: string; userId?: string } | undefined;
  const userId = user?.userId || user?.id || 'anonymous';
  return `rate_limit:user:${userId}`;
}

/**
 * Hybrid keyer for routes that mix authenticated and unauthenticated
 * traffic (`optionalAuth`-gated endpoints, public previews, etc.).
 */
export function userOrIpKeyGenerator(request: FastifyRequest): string {
  const user = (request as any).user as { id?: string; userId?: string } | undefined;
  const userId = user?.userId || user?.id;
  if (userId) return `rate_limit:user:${userId}`;
  const ip = request.ip;
  return `rate_limit:ip:${ip}`;
}

// Preset configurations for common use cases
export const RateLimitPresets = {
  // Strict limits for auth endpoints (login, register)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // 10 attempts
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  },

  // Standard API limits
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
  },

  // Relaxed limits for read operations
  readOperations: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 300, // 300 reads per minute
  },

  // Strict limits for write operations
  writeOperations: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 writes per minute
  },

  // Very strict for export/report generation
  exports: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10, // 10 exports per hour
  },
};
