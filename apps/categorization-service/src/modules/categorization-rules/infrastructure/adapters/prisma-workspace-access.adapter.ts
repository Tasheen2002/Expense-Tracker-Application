import { IWorkspaceAccessPort } from "../../domain/ports/workspace-access.port";

export class PrismaWorkspaceAccessAdapter implements IWorkspaceAccessPort {

  async isAdminOrOwner(userId: string, workspaceId: string): Promise<boolean> {
    const identityServiceUrl = process.env.IDENTITY_SERVICE_URL || 'http://localhost:3002';
    try {
      const response = await fetch(`${identityServiceUrl}/api/v1/workspaces/${workspaceId}/members/${userId}`);
      if (response.ok) {
        const body = await response.json() as any;
        const role = body.data?.role;
        return role === "owner" || role === "admin";
      }
      return false;
    } catch (error) {
      console.error('Error verifying workspace membership via identity service:', error);
      return false;
    }
  }
}
