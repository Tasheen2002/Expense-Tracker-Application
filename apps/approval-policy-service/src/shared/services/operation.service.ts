import {
  IWorkspaceAuthorizationService,
  WorkspaceMembershipContext,
} from '../ports/workspace-authorization.port';
import { IServiceAuthenticationPort } from '../ports/service-authentication.port';
import { DefaultServiceAuthenticationService } from './service-authentication.service';
import { UnauthorizedWorkspaceAccessError } from '../errors/workspace-authorization.error';

export interface AccessRequirement {
  readonly actorId?: string;
  readonly servicePrincipal?: string;
  readonly workspaceId: string;
  readonly role?: string;
  readonly authToken?: string;
}

/**
 * OperationService enforces authenticated actor authorization at the application boundary,
 * following the Identity Workspace OperationService pattern. Supports both interactive
 * user actors and verified system service principals.
 */
export class OperationService {
  protected readonly serviceAuthService: IServiceAuthenticationPort;

  constructor(
    protected readonly workspaceAuthService: IWorkspaceAuthorizationService,
    serviceAuthService?: IServiceAuthenticationPort
  ) {
    this.serviceAuthService = serviceAuthService ?? new DefaultServiceAuthenticationService();
  }

  async authorize(access: AccessRequirement): Promise<WorkspaceMembershipContext> {
    if (!access.workspaceId) {
      throw new UnauthorizedWorkspaceAccessError('Workspace ID is required for operation authorization');
    }

    // Explicit system/service principal authorization
    if (access.servicePrincipal) {
      const sp = access.servicePrincipal.trim();
      if (!sp) {
        throw new UnauthorizedWorkspaceAccessError('Service principal cannot be empty');
      }
      const isVerified = await this.serviceAuthService.verifyService(sp, {
        internalApiKey: access.authToken,
      });
      if (!isVerified) {
        throw new UnauthorizedWorkspaceAccessError(`Untrusted service principal: ${sp}`);
      }
      return {
        userId: sp,
        workspaceId: access.workspaceId,
        role: 'SYSTEM',
      };
    }

    if (!access.actorId) {
      throw new UnauthorizedWorkspaceAccessError('Actor ID or verified service principal is required for operation authorization');
    }

    return this.workspaceAuthService.authorize({
      userId: access.actorId,
      workspaceId: access.workspaceId,
      requiredRole: access.role,
      authToken: access.authToken,
    });
  }

  async execute<T>(access: AccessRequirement, work: () => Promise<T>): Promise<T> {
    await this.authorize(access);
    return work();
  }
}
