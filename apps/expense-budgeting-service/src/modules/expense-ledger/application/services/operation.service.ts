import { ExpenseDTO } from '../../domain/entities/expense.entity';
import { UnauthorizedExpenseAccessError } from '../../domain/errors/expense.errors';
import { IdentityServiceUnavailableError } from '../../domain/errors/workspace-authorization.error';
import {
  IWorkspaceAuthorizationPort,
  WorkspaceMembershipContext,
  AuthorizeWorkspaceInput,
  WorkspaceRole,
} from '../ports/workspace-authorization.port';

export {
  IWorkspaceAuthorizationPort,
  WorkspaceMembershipContext,
  AuthorizeWorkspaceInput,
  WorkspaceRole,
};

export interface AccessRequirement {
  readonly actorId: string;
  readonly workspaceId: string;
  readonly role?: WorkspaceRole | string;
  readonly requiredRole?: WorkspaceRole | string;
  readonly authToken?: string;
  readonly verifiedMembership?: WorkspaceMembershipContext;
}

/**
 * OperationService enforces application-boundary actor authentication and authorization
 * for the expense-ledger module, matching the pattern used in Identity Access and Approval Policy.
 */
export class OperationService {
  constructor(private readonly workspaceAuth: IWorkspaceAuthorizationPort) {
    if (!workspaceAuth) {
      throw new Error('IWorkspaceAuthorizationPort is mandatory for OperationService');
    }
  }

  /**
   * Authorizes that the actor has valid membership and permissions in the target workspace.
   */
  async authorize(access: AccessRequirement): Promise<WorkspaceMembershipContext> {
    if (!access.actorId) {
      throw new UnauthorizedExpenseAccessError(
        access.workspaceId || 'unknown',
        'anonymous',
        'perform operation'
      );
    }

    if (!access.workspaceId) {
      throw new UnauthorizedExpenseAccessError(
        'missing-workspace',
        access.actorId,
        'perform operation without workspace scope'
      );
    }

    const ROLE_HIERARCHY: Record<string, number> = {
      OWNER: 100,
      ADMIN: 80,
      MANAGER: 60,
      MEMBER: 40,
      VIEWER: 20,
    };

    // 1. If verified membership context is provided by trusted auth middleware, validate it
    if (access.verifiedMembership) {
      const verified = access.verifiedMembership;
      if (verified.userId !== access.actorId || verified.workspaceId !== access.workspaceId) {
        throw new UnauthorizedExpenseAccessError(
          access.workspaceId,
          access.actorId,
          'verified membership context does not match requested actor or workspace'
        );
      }

      const userRank = ROLE_HIERARCHY[verified.role.toUpperCase().trim()];
      if (userRank === undefined) {
        throw new UnauthorizedExpenseAccessError(
          access.workspaceId,
          access.actorId,
          `unrecognized role '${verified.role}'`
        );
      }

      if (access.requiredRole) {
        const requiredRank = ROLE_HIERARCHY[access.requiredRole.toUpperCase().trim()];
        if (requiredRank === undefined || userRank < requiredRank) {
          throw new UnauthorizedExpenseAccessError(
            access.workspaceId,
            access.actorId,
            `role '${verified.role}' does not meet required role '${access.requiredRole}'`
          );
        }
      }

      return verified;
    }

    // 2. Unverified caller-supplied role strings are strictly rejected / never trusted.
    // When verified membership is absent, delegate directly to the remote workspace authorization adapter.
    try {
      return await this.workspaceAuth.authorize({
        userId: access.actorId,
        workspaceId: access.workspaceId,
        requiredRole: access.requiredRole as WorkspaceRole | undefined,
        authToken: access.authToken,
      });
    } catch (err: unknown) {
      if (err instanceof UnauthorizedExpenseAccessError) {
        throw err;
      }

      const errorObj = typeof err === 'object' && err !== null ? (err as Record<string, unknown>) : null;
      const errName = typeof errorObj?.name === 'string' ? errorObj.name : undefined;
      const errCode = typeof errorObj?.code === 'string' ? errorObj.code : undefined;
      const errMessage = typeof errorObj?.message === 'string' ? errorObj.message : undefined;
      const errStatusCode = typeof errorObj?.statusCode === 'number' ? errorObj.statusCode : undefined;

      // Distinguish infrastructure failures from authorization denials
      const isServiceUnavailable =
        errName === 'AbortError' ||
        errCode === 'ECONNREFUSED' ||
        errCode === 'ECONNRESET' ||
        errCode === 'ETIMEDOUT' ||
        errCode === 'UND_ERR_CONNECT_TIMEOUT' ||
        errMessage?.includes('timeout') ||
        errMessage?.includes('ECONNREFUSED') ||
        errMessage?.includes('fetch failed') ||
        errStatusCode === 502 ||
        errStatusCode === 503 ||
        errStatusCode === 504;

      if (isServiceUnavailable) {
        throw new IdentityServiceUnavailableError(
          errMessage || 'Identity service is unavailable'
        );
      }

      throw new UnauthorizedExpenseAccessError(
        access.workspaceId,
        access.actorId,
        errMessage || 'workspace membership authorization failed'
      );
    }
  }

  async execute<T>(access: AccessRequirement, work: () => Promise<T>): Promise<T> {
    await this.authorize(access);
    return work();
  }

  /**
   * Authorizes access to view an expense.
   * Permits visibility if:
   * 1. The actor is the expense creator (expense.userId === actorId)
   * 2. The actor has an administrative or approver role ('ADMIN', 'OWNER', 'APPROVER', 'MANAGER')
   *
   * @throws UnauthorizedExpenseAccessError if the actor lacks visibility permission.
   */
  authorizeExpenseVisibility(
    actorId: string,
    expense: ExpenseDTO,
    role?: string
  ): void {
    const expenseId = expense.expenseId || (expense as { id?: string }).id || '';
    if (!actorId) {
      throw new UnauthorizedExpenseAccessError(expenseId, 'anonymous', 'view');
    }

    const normalizedRole = role?.toUpperCase();
    if (
      normalizedRole === 'ADMIN' ||
      normalizedRole === 'OWNER' ||
      normalizedRole === 'APPROVER' ||
      normalizedRole === 'MANAGER'
    ) {
      return;
    }

    if (expense.userId !== actorId) {
      throw new UnauthorizedExpenseAccessError(expenseId, actorId, 'view');
    }
  }

  /**
   * Authorizes access to filter/list expenses in a workspace.
   * - If actor is privileged ('ADMIN', 'OWNER', 'APPROVER', 'MANAGER'), they can filter
   *   by any requestedUserId, or leave it undefined to view workspace-wide expenses.
   * - If actor is a regular member:
   *   - If requestedUserId is provided and differs from actorId, throws UnauthorizedExpenseAccessError.
   *   - Otherwise, restricts visibility to actorId.
   */
  authorizeFilterVisibility(
    actorId: string,
    requestedUserId?: string,
    role?: string
  ): string | undefined {
    if (!actorId) {
      throw new UnauthorizedExpenseAccessError('unknown', 'anonymous', 'filter expenses');
    }

    const normalizedRole = role?.toUpperCase();
    const isPrivileged =
      normalizedRole === 'ADMIN' ||
      normalizedRole === 'OWNER' ||
      normalizedRole === 'APPROVER' ||
      normalizedRole === 'MANAGER';

    if (isPrivileged) {
      return requestedUserId;
    }

    if (requestedUserId && requestedUserId !== actorId) {
      throw new UnauthorizedExpenseAccessError(
        'workspace',
        actorId,
        'filter expenses of another member'
      );
    }

    return actorId;
  }
}
