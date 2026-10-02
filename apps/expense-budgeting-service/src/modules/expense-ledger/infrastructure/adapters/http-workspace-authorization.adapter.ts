import { z } from 'zod';
import {
  IWorkspaceAuthorizationPort,
  WorkspaceMembershipContext,
  AuthorizeWorkspaceInput,
  WorkspaceRole,
} from '../../application/ports/workspace-authorization.port';
import {
  UnauthorizedWorkspaceAccessError,
  IdentityServiceUnavailableError,
  DownstreamServiceError,
} from '../../domain/errors/workspace-authorization.error';

const SingleMembershipSchema = z.object({
  workspaceId: z.string().min(1),
  role: z.string().min(1),
  userId: z.string().min(1).optional(),
});

const MembershipResponseSchema = z.union([
  z.object({ data: SingleMembershipSchema }),
  SingleMembershipSchema,
]);

const ROLE_HIERARCHY: Record<string, number> = {
  OWNER: 100,
  ADMIN: 80,
  MANAGER: 60,
  MEMBER: 40,
  VIEWER: 20,
};

function hasSufficientRole(userRole: string, requiredRole: string): boolean {
  const normUserRole = userRole.toUpperCase().trim();
  const normReqRole = requiredRole.toUpperCase().trim();
  const userRank = ROLE_HIERARCHY[normUserRole];
  const requiredRank = ROLE_HIERARCHY[normReqRole];

  if (userRank === undefined || requiredRank === undefined) {
    return false;
  }

  return userRank >= requiredRank;
}

export interface HttpWorkspaceAuthorizationAdapterOptions {
  identityServiceUrl?: string;
  internalApiKey?: string;
  timeoutMs?: number;
}

export class HttpWorkspaceAuthorizationAdapter implements IWorkspaceAuthorizationPort {
  private readonly identityServiceUrl: string;
  private readonly internalApiKey: string;
  private readonly timeoutMs: number;

  constructor(options?: HttpWorkspaceAuthorizationAdapterOptions | string) {
    if (typeof options === 'string') {
      this.identityServiceUrl = options;
      this.internalApiKey = process.env.INTERNAL_API_KEY || '';
      this.timeoutMs = 5000;
    } else {
      this.identityServiceUrl =
        options?.identityServiceUrl ||
        process.env.IDENTITY_SERVICE_URL ||
        'http://localhost:3002';
      this.internalApiKey =
        options?.internalApiKey ??
        process.env.INTERNAL_API_KEY ??
        '';
      this.timeoutMs = options?.timeoutMs || 5000;
    }
  }

  async authorize(input: AuthorizeWorkspaceInput): Promise<WorkspaceMembershipContext> {
    const { userId, workspaceId, requiredRole, authToken } = input;

    if (!userId || !workspaceId) {
      throw new UnauthorizedWorkspaceAccessError(
        'User ID and Workspace ID are required for workspace authorization'
      );
    }

    const url = `${this.identityServiceUrl}/api/v1/workspaces/${workspaceId}/members/${userId}`;
    const headers: Record<string, string> = {
      'x-user-id': userId,
    };
    if (authToken) {
      headers.authorization = authToken.startsWith('Bearer ')
        ? authToken
        : `Bearer ${authToken}`;
    }
    if (this.internalApiKey) {
      headers['x-internal-api-key'] = this.internalApiKey;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
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

    const membership =
      'data' in parseResult.data ? parseResult.data.data : parseResult.data;

    if (membership.workspaceId !== workspaceId) {
      throw new UnauthorizedWorkspaceAccessError(
        `User ${userId} is not a member of workspace ${workspaceId}`
      );
    }

    if (membership.userId && membership.userId !== userId) {
      throw new UnauthorizedWorkspaceAccessError(
        `User ${userId} does not match membership user ID ${membership.userId}`
      );
    }

    const normalizedRole = membership.role.toUpperCase().trim();
    if (!(normalizedRole in ROLE_HIERARCHY)) {
      throw new UnauthorizedWorkspaceAccessError(
        `User ${userId} has unrecognized role ${membership.role} in workspace ${workspaceId}`
      );
    }

    if (requiredRole && !hasSufficientRole(membership.role, requiredRole)) {
      throw new UnauthorizedWorkspaceAccessError(
        `User ${userId} does not have the required role ${requiredRole} in workspace ${workspaceId}`
      );
    }

    return {
      userId,
      workspaceId,
      role: normalizedRole as WorkspaceRole,
    };
  }
}
