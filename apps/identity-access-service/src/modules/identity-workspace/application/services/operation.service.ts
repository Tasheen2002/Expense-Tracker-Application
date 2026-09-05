import { IUserRepository } from '../../domain/repositories/user.repository';
import { IWorkspaceRepository } from '../../domain/repositories/workspace.repository';
import { IWorkspaceMembershipRepository } from '../../domain/repositories/workspace-membership.repository';
import { UserId } from '../../domain/value-objects/user-id.vo';
import { WorkspaceId } from '../../domain/value-objects/workspace-id.vo';
import { WorkspaceRole } from '../../domain/entities/workspace-membership.entity';
import { InsufficientPermissionsError, UserInactiveError, UserNotFoundError, WorkspaceInactiveError, WorkspaceNotFoundError } from '../../domain/errors/identity.errors';
import { IUnitOfWork, OperationContext } from '../ports/unit-of-work';

export interface AccessRequirement extends OperationContext {
  workspaceId?: string;
  role?: WorkspaceRole;
}

/** The application boundary owns actor policy and the command transaction. */
export class OperationService {
  constructor(
    private readonly unitOfWork: IUnitOfWork,
    private readonly users: IUserRepository,
    private readonly workspaces: IWorkspaceRepository,
    private readonly memberships: IWorkspaceMembershipRepository,
  ) {}

  async authorize(access: AccessRequirement): Promise<void> {
    if (!access.actorId) throw new InsufficientPermissionsError('perform this operation');
    const user = await this.users.findById(UserId.fromString(access.actorId));
    if (!user) throw new UserNotFoundError(access.actorId);
    if (!user.isActive) throw new UserInactiveError();
    if (!access.workspaceId) return;
    const workspaceId = WorkspaceId.fromString(access.workspaceId);
    const member = await this.memberships.findByUserAndWorkspace(user.id, workspaceId);
    if (!member) throw new InsufficientPermissionsError('access this workspace');
    const workspace = await this.workspaces.findById(workspaceId);
    if (!workspace) throw new WorkspaceNotFoundError(access.workspaceId);
    if (!workspace.isActive) throw new WorkspaceInactiveError(access.workspaceId);
    if (access.role === WorkspaceRole.OWNER && (!member.isOwner() || !workspace.isOwner(user.id))) {
      throw new InsufficientPermissionsError('manage workspace ownership');
    }
    if (access.role === WorkspaceRole.ADMIN && !member.canManageMembers()) {
      throw new InsufficientPermissionsError('manage this workspace');
    }
  }

  execute<T>(access: AccessRequirement, work: () => Promise<T>): Promise<T> {
    return this.unitOfWork.execute(async () => {
      await this.authorize(access);
      return work();
    }, access);
  }

  register<T>(work: () => Promise<T>): Promise<T> {
    return this.unitOfWork.execute(work);
  }

  async authorizeUserLookup(actorId: string, targetId: string): Promise<void> {
    await this.authorize({ actorId });
    if (actorId !== targetId && !await this.users.sharesWorkspace(UserId.fromString(actorId), UserId.fromString(targetId))) {
      throw new InsufficientPermissionsError('view this user');
    }
  }

  async authorizeEmailLookup(actorId: string, email: string): Promise<void> {
    await this.authorize({ actorId });
    const user = await this.users.findById(UserId.fromString(actorId));
    if (user?.email.getValue() !== email.trim().toLowerCase()) throw new InsufficientPermissionsError('view these invitations');
  }
}
