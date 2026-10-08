import { z } from 'zod';
import { UserId, WorkspaceId } from '@core/domain/value-objects';
import { IWorkspaceAccessPort } from '../../application/ports/workspace-access.port';

export class WorkspaceAccessUnavailableError extends Error {
  readonly statusCode = 503;
  readonly code = 'WORKSPACE_ACCESS_UNAVAILABLE';
  constructor() {
    super('Workspace authorization service is unavailable');
    this.name = 'WorkspaceAccessUnavailableError';
  }
}

const membershipSchema = z.object({ data: z.object({
  userId: z.string().uuid(), workspaceId: z.string().uuid(), role: z.string(),
}) });

export class HttpWorkspaceAccessAdapter implements IWorkspaceAccessPort {
  constructor(private readonly options: { identityServiceUrl?: string; internalApiKey?: string; timeoutMs?: number } = {}) {}

  async isAdminOrOwner(userId: UserId, workspaceId: WorkspaceId): Promise<boolean> {
    const role = await this.getRole(userId, workspaceId);
    return role === 'owner' || role === 'admin';
  }

  async isMember(userId: UserId, workspaceId: WorkspaceId): Promise<boolean> {
    const role = await this.getRole(userId, workspaceId);
    return role !== null && ['owner', 'admin', 'manager', 'member'].includes(role);
  }

  private async getRole(userId: UserId, workspaceId: WorkspaceId): Promise<string | null> {
    const key = this.options.internalApiKey ?? process.env.INTERNAL_API_KEY;
    if (!key) throw new WorkspaceAccessUnavailableError();
    const baseUrl = (this.options.identityServiceUrl ?? process.env.IDENTITY_SERVICE_URL ?? 'http://localhost:3002').replace(/\/+$/, '');
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/api/v1/workspaces/${workspaceId.getValue()}/members/${userId.getValue()}`, {
        redirect: 'error',
        headers: { 'x-internal-api-key': key, 'x-user-id': userId.getValue() },
        signal: AbortSignal.timeout(this.options.timeoutMs ?? 5000),
      });
    } catch {
      throw new WorkspaceAccessUnavailableError();
    }
    if (response.status === 403 || response.status === 404) return null;
    if (!response.ok) throw new WorkspaceAccessUnavailableError();
    let membership: z.infer<typeof membershipSchema>;
    try { membership = membershipSchema.parse(await response.json()); }
    catch { throw new WorkspaceAccessUnavailableError(); }
    if (membership.data.workspaceId.toLowerCase() !== workspaceId.getValue() ||
        membership.data.userId.toLowerCase() !== userId.getValue()) return null;
    return membership.data.role.trim().toLowerCase();
  }
}
