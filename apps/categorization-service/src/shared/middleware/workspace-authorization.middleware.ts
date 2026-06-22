import { FastifyReply } from "fastify";
import { PrismaClient } from "@prisma/client";
import { AuthenticatedRequest } from "../interfaces/authenticated-request.interface";

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
  prisma: PrismaClient,
) {
  const userId = request.user?.userId;
  const { workspaceId } = request.params as { workspaceId: string };

  // Check authentication
  if (!userId) {
    return reply.status(401).send({
      success: false,
      statusCode: 401,
      message: "Authentication required",
    });
  }

  // Check workspaceId presence
  if (!workspaceId) {
    return reply.status(400).send({
      success: false,
      statusCode: 400,
      message: "Workspace ID is required",
    });
  }

  // Validate UUID format
  const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(workspaceId)) {
    return reply.status(400).send({
      success: false,
      statusCode: 400,
      message: "Invalid workspace ID format",
    });
  }

  // Check workspace membership
  let membership: { role: string; workspaceId: string } | null = null;

  if ('workspaceMembership' in prisma) {
    // Local database check for identity-access-service
    membership = await (prisma as any).workspaceMembership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });
  } else {
    // Remote HTTP check for other microservices
    const identityServiceUrl = process.env.IDENTITY_SERVICE_URL || 'http://localhost:3002';
    try {
      const authHeader = request.headers.authorization;
      const response = await fetch(
        `${identityServiceUrl}/api/v1/workspaces/${workspaceId}/members/${userId}`,
        {
          headers: {
            ...(authHeader ? { authorization: authHeader } : {}),
          },
        }
      );

      if (response.ok) {
        const body = await response.json() as any;
        membership = body.data;
      }
    } catch (error) {
      request.log.error(error, 'Error verifying workspace membership via identity-service');
      return reply.status(500).send({
        success: false,
        statusCode: 500,
        message: "Internal server error during authorization check",
      });
    }
  }

  if (!membership) {
    return reply.status(403).send({
      success: false,
      statusCode: 403,
      message: "Access denied: You are not a member of this workspace",
    });
  }

  // Attach workspace membership info to request for use in handlers
  request.workspaceMembership = {
    role: membership.role,
    workspaceId: membership.workspaceId,
  };
}

// Extend Fastify request type
declare module "fastify" {
  interface FastifyRequest {
    workspaceMembership?: {
      role: string;
      workspaceId: string;
    };
  }
}
