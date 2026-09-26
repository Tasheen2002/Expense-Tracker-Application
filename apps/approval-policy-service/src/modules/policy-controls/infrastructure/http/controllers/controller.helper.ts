import { FastifyRequest } from 'fastify';

/**
 * Safely extracts the authenticated actor ID from FastifyRequest.
 * Throws an HTTP 401 error if user is missing, avoiding unsafe non-null assertions.
 */
export function getAuthenticatedActorId(request: FastifyRequest): string {
  const user = request.user;
  const actorId = user?.userId;
  if (!actorId) {
    const error = new Error('Authentication required') as Error & { statusCode: number };
    error.statusCode = 401;
    throw error;
  }
  return actorId;
}

/**
 * Safely extracts the bearer authorization token or internal API key from request headers.
 */
export function extractAuthToken(request: FastifyRequest): string | undefined {
  return (
    request.headers.authorization ||
    (request.headers['x-internal-api-key'] as string | undefined)
  );
}
