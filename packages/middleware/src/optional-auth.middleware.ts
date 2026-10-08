import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Best-effort authentication for routes that work for both signed-in users
 * and guests. Populates `request.user` when a valid token is present;
 * silently continues when missing or invalid (401). Infrastructure failures
 * propagate to the server error boundary instead of disguising an outage as guest access.
 *
 * Pair with `userOrIpKeyGenerator` from the rate-limiter when the route
 * mixes auth + guest traffic — authenticated callers get a per-user
 * bucket, guests fall back to per-IP.
 *
 * @example
 *   fastify.get('/recurring-expenses/preview', {
 *     preHandler: [optionalAuth],
 *   }, ...);
 */
export async function optionalAuth(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  try {
    await (request.server as typeof request.server & {
      authenticate(request: FastifyRequest): Promise<void>;
    }).authenticate(request);
  } catch (error: unknown) {
    if (!error || typeof error !== 'object' || !('statusCode' in error) || error.statusCode !== 401) {
      throw error;
    }
    // Intentionally swallow — guest access is allowed.
  }
}
