import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';
import { WorkspaceMembershipService } from '../services/workspace-membership.service';
import { OperationService } from '../services/operation.service';
import { WorkspaceRole, WorkspaceMembershipDTO } from '../../domain/entities/workspace-membership.entity';
import { InsufficientPermissionsError, MembershipNotFoundError } from '../../domain/errors/identity.errors';

export interface ChangeMemberRoleCommand extends ICommand {
  readonly actorId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly role: WorkspaceRole;
}

export class ChangeMemberRoleHandler implements ICommandHandler<ChangeMemberRoleCommand, CommandResult<WorkspaceMembershipDTO>> {
  constructor(
    private readonly service: WorkspaceMembershipService,
    private readonly operations: OperationService
  ) {}

  async handle(command: ChangeMemberRoleCommand): Promise<CommandResult<WorkspaceMembershipDTO>> {
    const data = await this.operations.execute(
      { actorId: command.actorId, workspaceId: command.workspaceId, role: WorkspaceRole.ADMIN },
      async () => {
        if (command.actorId === command.userId) {
          throw new InsufficientPermissionsError('change your own role');
        }
        const membership = await this.service.getUserMembership(command.userId, command.workspaceId);
        if (!membership) {
          throw new MembershipNotFoundError(command.userId, command.workspaceId);
        }
        return this.service.changeMemberRole(membership.id.getValue(), command.role);
      }
    );
    return CommandResult.success(data);
  }
}
