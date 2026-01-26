import { FastifyRequest, FastifyReply } from "fastify";
import { container } from "../../../../../apps/api/src/container";
import { WorkspaceMembershipService } from "../../../application/services/workspace-membership.service";

export async function authorizeWorkspace(
  request: FastifyRequest<{ Params: { workspaceId: string } }>,
  reply: FastifyReply,
) {
  try {
    const { workspaceId } = request.params;
    const userId = request.user?.userId;

    if (!userId) {
      return reply.status(401).send({
        success: false,
        message: "Unauthorized: User not authenticated",
      });
    }

    if (!workspaceId) {
      // If no workspaceId in params, skip this check (or throw error depend on usage)
      return;
    }

    // Resolve service from container directly (Service Locator pattern for middleware)
    // Ideally this should be injected, but middleware signatures are strict
    const membershipService = container.get<WorkspaceMembershipService>(
      "workspaceMembershipService",
    );

    const isMember = await membershipService.isMember(userId, workspaceId);

    if (!isMember) {
      return reply.status(403).send({
        success: false,
        message: "Forbidden: You are not a member of this workspace",
      });
    }
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      message: "Internal Server Error during authorization",
    });
  }
}
