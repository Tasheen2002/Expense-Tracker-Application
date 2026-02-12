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
  const membership = await prisma.workspaceMembership.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
  });

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
