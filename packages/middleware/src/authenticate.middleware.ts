import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Per-route authentication middleware. Canonical entry point for the
 * `preHandler` array on every protected route.
 *
 * Delegates JWT verification to `request.server.authenticate` (registered
 * by the auth plugin) and converts authentication failures into a uniform 401
 * envelope. The role-authorization middlewares (`requireRole`,
 * `RolePermissions.*`) only check that `request.user` was populated —
 * they do NOT verify the token, so this middleware MUST run first.
 *
 * @example
 *   fastify.post('/expenses', {
 *     preHandler: [authenticate, validateBody(createExpenseSchema)],
 *   }, ...);
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    await (request.server as typeof request.server & {
      authenticate(request: FastifyRequest): Promise<void>;
    }).authenticate(request);
  } catch (error: unknown) {
    if (!error || typeof error !== 'object' || !('statusCode' in error) || error.statusCode !== 401) {
      throw error;
    }
    await reply.status(401).send({
      success: false,
      statusCode: 401,
      message: 'Unauthorized',
    });
  }
}
