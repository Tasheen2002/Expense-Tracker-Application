import {
  IWorkspaceAuthorizationService,
  WorkspaceMembershipContext,
} from '../../../../shared/ports/workspace-authorization.port';
import {
  OperationService as SharedOperationService,
  AccessRequirement,
} from '../../../../shared/services/operation.service';
import { UnauthorizedWorkflowViewError } from '../../domain/errors/approval-workflow.errors';

export { AccessRequirement };

/**
 * OperationService enforces authenticated actor authorization at the application boundary,
 * following the Identity Workspace OperationService pattern.
 */
export class OperationService extends SharedOperationService {
  constructor(workspaceAuthService: IWorkspaceAuthorizationService) {
    super(workspaceAuthService);
  }

  /**
   * Authorizes user lookup across workspace boundaries (e.g. for user workflows or pending approval queues).
   * - If actor is accessing their own data (actorId === targetUserId), standard workspace membership is verified.
   * - If actor is accessing another user's data (actorId !== targetUserId), ADMIN role is required.
   */
  async authorizeUserLookup(
    actorId: string,
    workspaceId: string,
    targetUserId: string,
    authToken?: string
  ): Promise<WorkspaceMembershipContext> {
    const isSelf = actorId.toLowerCase() === targetUserId.toLowerCase();
    return this.authorize({
      actorId,
      workspaceId,
      role: isSelf ? undefined : 'ADMIN',
      authToken,
    });
  }

  /**
   * Authorizes access to view a workflow aggregate or DTO.
   * Grants visibility if the actor:
   * 1. Is the expense requester (workflow.userId === actorId)
   * 2. Is an assigned or delegated approver on any step
   * 3. Is a workspace administrator (ADMIN or OWNER role)
   *
   * @throws UnauthorizedWorkflowViewError if actor is not authorized to view the workflow.
   */
  authorizeWorkflowVisibility(
    actorId: string,
    membership: WorkspaceMembershipContext,
    workflow: { userId: string; expenseId: string; steps?: Array<{ approverId: string; delegatedTo?: string }> }
  ): void {
    const role = membership.role.toUpperCase();
    if (role === 'ADMIN' || role === 'OWNER') {
      return;
    }
    const normalizedActor = actorId.toLowerCase();
    if (workflow.userId.toLowerCase() === normalizedActor) {
      return;
    }
    const isApprover = workflow.steps?.some(
      (s) =>
        s.approverId.toLowerCase() === normalizedActor ||
        s.delegatedTo?.toLowerCase() === normalizedActor
    );
    if (isApprover) {
      return;
    }

    throw new UnauthorizedWorkflowViewError(actorId, workflow.expenseId);
  }
}

