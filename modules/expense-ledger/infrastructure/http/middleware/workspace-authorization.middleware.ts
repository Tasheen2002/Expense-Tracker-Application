import { FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient } from "@prisma/client";

export async function workspaceAuthorizationMiddleware(
  request: FastifyRequest<{ Params: { workspaceId: string } }>,
  reply: FastifyReply,
  prisma: PrismaClient,
) {
  const userId = request.user?.userId;
  const { workspaceId } = request.params;

  if (!userId) {
    return reply.status(401).send({
      success: false,
      statusCode: 401,
      message: "Authentication required",
    });
  }

  if (!workspaceId) {
    return reply.status(400).send({
      success: false,
      statusCode: 400,
      message: "Workspace ID is required",
    });
  }

  // Check if user is a member of the workspace
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
