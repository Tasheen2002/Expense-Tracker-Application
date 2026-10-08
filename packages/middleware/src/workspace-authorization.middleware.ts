import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from './interfaces/authenticated-request.interface';

/**
 * Workspace Authorization Middleware
 *
 * Validates that the authenticated user is a member of the requested workspace.
 * This middleware should be applied to all workspace-scoped routes.
 *
 * @throws 401 - If user is not authenticated
 * @throws 400 - If workspaceId is missing or invalid format
 * @throws 403 - If user is not a member of the workspace
 */
export async function workspaceAuthorizationMiddleware(
  request: AuthenticatedRequest,
  reply: FastifyReply,
  prisma?: any,
) {
  const userId = request.user?.userId || request.user?.id;
  const { workspaceId } = (request.params || {}) as { workspaceId: string };

  // Check authentication
  if (!userId) {
    return reply.status(401).send({
      success: false,
      statusCode: 401,
      message: 'Authentication required',
    });
  }

  // Check workspaceId presence
  if (!workspaceId) {
    return reply.status(400).send({
      success: false,
      statusCode: 400,
      message: 'Workspace ID is required',
    });
  }

  // Validate UUID format
  const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(workspaceId)) {
    return reply.status(400).send({
      success: false,
      statusCode: 400,
      message: 'Invalid workspace ID format',
    });
  }

  // Check workspace membership
  let membership: { role: string; workspaceId: string } | null = null;
  const VALID_ROLES = new Set(['OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'VIEWER']);

  if (prisma && 'workspaceMembership' in prisma) {
    // Local database check for identity-access-service
    const localMembership = await (prisma as any).workspaceMembership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    if (localMembership) {
      const rawRole = String(localMembership.role || '').toUpperCase().trim();
      if (VALID_ROLES.has(rawRole)) {
        membership = {
          role: rawRole,
          workspaceId,
        };
      }
    }
  } else {
    // Remote HTTP check for other microservices
    const identityServiceUrl = process.env.IDENTITY_SERVICE_URL || 'http://localhost:3002';
    const timeoutMs = parseInt(process.env.IDENTITY_SERVICE_TIMEOUT_MS || '5000', 10);

    try {
      const authHeader = request.headers.authorization;
      const response = await fetch(
        `${identityServiceUrl}/api/v1/workspaces/${workspaceId}/members/${userId}`,
        {
          redirect: 'error',
          headers: {
            ...(authHeader ? { authorization: authHeader } : {}),
            ...(process.env.INTERNAL_API_KEY
              ? { 'x-internal-api-key': process.env.INTERNAL_API_KEY }
              : {}),
            'x-user-id': userId,
          },
          signal: AbortSignal.timeout(timeoutMs),
        }
      );

      if (response.status >= 500) {
        request.log.error(
          { status: response.status, workspaceId, userId },
          'Identity Access Service encountered internal error during authorization check'
        );
        return reply.status(503).send({
          success: false,
          statusCode: 503,
          message: 'Identity Access Service is temporarily unavailable',
        });
      }

      if (response.status === 401 || response.status === 403 || response.status === 404) {
        return reply.status(403).send({
          success: false,
          statusCode: 403,
          message: 'Access denied: You are not a member of this workspace',
        });
      }

      if (!response.ok) {
        return reply.status(502).send({
          success: false,
          statusCode: 502,
          message: 'Downstream authorization service returned an unexpected status',
        });
      }

      const body = (await response.json()) as any;
      const data = body?.data || body;

      if (!data || typeof data !== 'object') {
        return reply.status(502).send({
          success: false,
          statusCode: 502,
          message: 'Invalid authorization response from Identity Service',
        });
      }

      // Fail-closed verification of returned workspaceId and userId
      if (!data.workspaceId || data.workspaceId !== workspaceId) {
        request.log.warn(
          { expectedWorkspace: workspaceId, returnedWorkspace: data.workspaceId },
          'Authorization contract violation: workspace ID mismatch'
        );
        return reply.status(403).send({
          success: false,
          statusCode: 403,
          message: 'Access denied: Workspace ID mismatch',
        });
      }

      if (data.userId !== userId) {
        request.log.warn(
          { expectedUser: userId, returnedUser: data.userId },
          'Authorization contract violation: user ID mismatch'
        );
        return reply.status(403).send({
          success: false,
          statusCode: 403,
          message: 'Access denied: User ID mismatch',
        });
      }

      const rawRole = String(data.role || '').toUpperCase().trim();
      if (!VALID_ROLES.has(rawRole)) {
        request.log.warn(
          { role: data.role },
          'Authorization contract violation: unrecognized membership role'
        );
        return reply.status(403).send({
          success: false,
          statusCode: 403,
          message: 'Access denied: Unrecognized workspace role',
        });
      }

      membership = {
        role: rawRole,
        workspaceId,
      };
    } catch (error: any) {
      request.log.error(error, 'Error verifying workspace membership via identity-service');
      const isTimeout = error?.name === 'TimeoutError' || error?.name === 'AbortError';
      return reply.status(isTimeout ? 504 : 500).send({
        success: false,
        statusCode: isTimeout ? 504 : 500,
        message: isTimeout
          ? 'Gateway timeout during authorization check'
          : 'Internal server error during authorization check',
      });
    }
  }

  if (!membership) {
    return reply.status(403).send({
      success: false,
      statusCode: 403,
      message: 'Access denied: You are not a member of this workspace',
    });
  }

  // Attach workspace membership info to request for use in handlers
  request.workspaceMembership = {
    role: membership.role,
    workspaceId: membership.workspaceId,
  };
}
