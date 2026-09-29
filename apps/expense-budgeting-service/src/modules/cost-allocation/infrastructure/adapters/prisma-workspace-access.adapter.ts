import { IWorkspaceAccessPort } from "../../application/ports/workspace-access.port";
import { WorkspaceAuthorizationUnavailableError } from "../../domain/errors/cost-allocation.errors";

interface MemberResponse {
  data?: { userId?: string; workspaceId?: string; role?: string };
}

export class PrismaWorkspaceAccessAdapter implements IWorkspaceAccessPort {
  async isAdminOrOwner(userId: string, workspaceId: string): Promise<boolean> {
    const role = await this.getRole(userId, workspaceId);
    return role === 'owner' || role === 'admin';
  }

  async isMember(userId: string, workspaceId: string): Promise<boolean> {
    return (await this.getRole(userId, workspaceId)) !== null;
  }

  private async getRole(userId: string, workspaceId: string): Promise<'owner' | 'admin' | 'member' | null> {
    const key = process.env.INTERNAL_API_KEY;
    if (!key) throw new WorkspaceAuthorizationUnavailableError();

    const identityServiceUrl = process.env.IDENTITY_SERVICE_URL || 'http://localhost:3002';
    let response: Response;
    try {
      response = await fetch(`${identityServiceUrl}/api/v1/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(userId)}`, {
        headers: { 'x-internal-api-key': key, 'x-user-id': userId },
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new WorkspaceAuthorizationUnavailableError();
    }

    if (response.status === 403 || response.status === 404) return null;
    if (!response.ok) throw new WorkspaceAuthorizationUnavailableError();

    try {
      const member = (await response.json() as MemberResponse).data;
      if (member?.userId !== userId || member.workspaceId !== workspaceId) {
        throw new WorkspaceAuthorizationUnavailableError();
      }
      if (member.role !== 'owner' && member.role !== 'admin' && member.role !== 'member') {
        throw new WorkspaceAuthorizationUnavailableError();
      }
      return member.role;
    } catch {
      throw new WorkspaceAuthorizationUnavailableError();
    }
  }
}
