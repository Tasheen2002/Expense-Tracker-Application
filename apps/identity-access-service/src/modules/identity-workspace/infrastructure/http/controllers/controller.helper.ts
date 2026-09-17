import { FastifyRequest } from 'fastify';
import { JWTPayload } from '../../../../../types/fastify.d';

/**
 * Safely extracts the authenticated user from the FastifyRequest.
 * Throws a 401 Unauthorized error if the user context is missing,
 * avoiding the need for non-null assertions (`!`) or unsafe casts.
 */
export function getAuthenticatedUser(request: FastifyRequest): JWTPayload {
  if (!request.user) {
    const error = new Error('Authentication required') as Error & { statusCode: number };
    error.statusCode = 401;
    throw error;
  }
  return request.user;
}
