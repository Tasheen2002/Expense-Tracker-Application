import { createRateLimiter, RateLimitPresets } from '@shared/middleware/rate-limiter.middleware';

// Separate read/write buckets; do not let forwarded headers or request bodies
// choose a bucket. This is per-process protection, not a distributed quota.
export const notificationReadRateLimit = createRateLimiter({
  ...RateLimitPresets.readOperations,
  keyGenerator: request => `notification:read:${request.user?.userId ?? request.ip}`,
});

export const notificationWriteRateLimit = createRateLimiter({
  ...RateLimitPresets.writeOperations,
  keyGenerator: request => `notification:write:${request.user?.userId ?? request.ip}`,
});

export const notificationWebhookRateLimit = createRateLimiter({
  ...RateLimitPresets.api,
  keyGenerator: request => `notification:webhook:${request.ip}`,
});
