import { FastifyRequest, FastifyReply } from "fastify";

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

/**
 * Creates a rate limiter middleware for Fastify.
 */
export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = defaultKeyGenerator,
    skipFailedRequests = false,
    message = "Too many requests, please try again later.",
    statusCode = 429,
    headers = true,
  } = options;

  return async (request: FastifyRequest, reply: FastifyReply) => {
    const key = keyGenerator(request);
    const entry = store.increment(key, windowMs);

    const remaining = Math.max(0, maxRequests - entry.count);
    const resetTime = Math.ceil(entry.resetAt / 1000);

    // Add rate limit headers
    if (headers) {
      reply.header("X-RateLimit-Limit", maxRequests);
      reply.header("X-RateLimit-Remaining", remaining);
      reply.header("X-RateLimit-Reset", resetTime);
    }

    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - Date.now()) / 1000);
      reply.header("Retry-After", retryAfter);

      return reply.status(statusCode).send({
        error: "Too Many Requests",
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
  const forwarded = request.headers["x-forwarded-for"];
  const ip =
    typeof forwarded === "string" ? forwarded.split(",")[0].trim() : request.ip;
  return `rate_limit:${ip}`;
}

/**
 * Key generator that includes route path.
 */
export function endpointKeyGenerator(request: FastifyRequest): string {
  const ip = defaultKeyGenerator(request).replace("rate_limit:", "");
  return `rate_limit:${ip}:${request.method}:${request.routerPath}`;
}

/**
 * Key generator for authenticated users.
 */
export function userKeyGenerator(request: FastifyRequest): string {
  const userId = (request as any).user?.id || "anonymous";
  return `rate_limit:user:${userId}`;
}

// Preset configurations for common use cases
export const RateLimitPresets = {
  // Strict limits for auth endpoints (login, register)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // 10 attempts
    message:
      "Too many authentication attempts. Please try again in 15 minutes.",
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
