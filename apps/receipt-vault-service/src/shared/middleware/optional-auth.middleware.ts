import { FastifyRequest, FastifyReply } from "fastify";

/**
 * Best-effort authentication for routes that work for both signed-in users
 * and guests. Populates `request.user` when a valid token is present;
 * silently continues when missing or invalid.
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
    await request.server.authenticate(request);
  } catch {
    // Intentionally swallow — guest access is allowed.
  }
}
