import { PrismaClient } from "@prisma/client";
import { IWorkspaceAccessPort } from "../../application/ports/workspace-access.port";

export class PrismaWorkspaceAccessAdapter implements IWorkspaceAccessPort {
  constructor(private readonly prisma: PrismaClient) {}

  async isAdminOrOwner(userId: string, workspaceId: string): Promise<boolean> {
    const membership = await this.prisma.workspaceMembership.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId,
        },
      },
    });

    if (!membership) {
      return false;
    }

    return membership.role === "owner" || membership.role === "admin";
  }
}
