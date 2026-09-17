import { z } from 'zod';
import {
  IWorkspaceAuthorizationService,
  WorkspaceMembershipContext,
} from '../../ports/workspace-authorization.port';
import {
  UnauthorizedWorkspaceAccessError,
  IdentityServiceUnavailableError,
  DownstreamServiceError,
} from '../../errors/workspace-authorization.error';

const MembershipResponseSchema = z.object({
  data: z.object({
    workspaceId: z.string().min(1),
    role: z.string().min(1),
    userId: z.string().min(1).optional(),
  }),
});

export interface HttpWorkspaceAuthorizationAdapterOptions {
  identityServiceUrl?: string;
  timeoutMs?: number;
}

export class HttpWorkspaceAuthorizationAdapter
  implements IWorkspaceAuthorizationService
{
  private readonly identityServiceUrl: string;
  private readonly timeoutMs: number;

  constructor(options?: HttpWorkspaceAuthorizationAdapterOptions) {
    this.identityServiceUrl =
      options?.identityServiceUrl ||
      process.env.IDENTITY_SERVICE_URL ||
      'http://localhost:3002';
    this.timeoutMs = options?.timeoutMs || 5000;
  }

  async authorize(input: {
    userId: string;
    workspaceId: string;
    requiredRole?: string;
    authToken?: string;
  }): Promise<WorkspaceMembershipContext> {
    const { userId, workspaceId, requiredRole, authToken } = input;

    const url = `${this.identityServiceUrl}/api/v1/workspaces/${workspaceId}/members/${userId}`;
    const headers: Record<string, string> = {};
    if (authToken) {
      headers.authorization = authToken.startsWith('Bearer ')
        ? authToken
        : `Bearer ${authToken}`;
    }
    const internalKey = process.env.INTERNAL_API_KEY;
    if (internalKey) {
      headers['x-internal-api-key'] = internalKey;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      // Network failure, connection refused, or timeout
      throw new IdentityServiceUnavailableError(
        'Identity Access Service is unreachable or timed out'
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new UnauthorizedWorkspaceAccessError(
        `User ${userId} is not an authorized member of workspace ${workspaceId}`
      );
    }

    if (response.status === 404) {
      throw new UnauthorizedWorkspaceAccessError(
        `User ${userId} is not a member of workspace ${workspaceId}`
      );
    }

    if (response.status >= 500) {
      throw new IdentityServiceUnavailableError(
        'Identity Access Service encountered an internal server error'
      );
    }

    if (!response.ok) {
      throw new DownstreamServiceError(
        `Identity Access Service returned unexpected HTTP ${response.status}`
      );
    }

    let rawJson: unknown;
    try {
      rawJson = await response.json();
    } catch {
      throw new DownstreamServiceError(
        'Identity Access Service returned an invalid JSON response'
      );
    }

    const parseResult = MembershipResponseSchema.safeParse(rawJson);
    if (!parseResult.success) {
      throw new DownstreamServiceError(
        'Identity Access Service returned an invalid membership response structure'
      );
    }

    const membership = parseResult.data.data;

    if (membership.workspaceId !== workspaceId) {
      throw new UnauthorizedWorkspaceAccessError(
        `User ${userId} is not a member of workspace ${workspaceId}`
      );
    }

    if (
      requiredRole &&
      membership.role !== requiredRole &&
      membership.role !== 'OWNER' &&
      membership.role !== 'ADMIN'
    ) {
      throw new UnauthorizedWorkspaceAccessError(
        `User ${userId} does not have the required role ${requiredRole} in workspace ${workspaceId}`
      );
    }

    return {
      userId,
      workspaceId,
      role: membership.role,
    };
  }
}
