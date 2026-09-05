import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';
import { WorkspaceMembershipService } from '../services/workspace-membership.service';
import { OperationService } from '../services/operation.service';
import { WorkspaceRole } from '../../domain/entities/workspace-membership.entity';
import { InsufficientPermissionsError, MembershipNotFoundError } from '../../domain/errors/identity.errors';

export interface RemoveMemberCommand extends ICommand {
  readonly actorId: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class RemoveMemberHandler implements ICommandHandler<RemoveMemberCommand, CommandResult<void>> {
  constructor(
    private readonly service: WorkspaceMembershipService,
    private readonly operations: OperationService
  ) {}

  async handle(command: RemoveMemberCommand): Promise<CommandResult<void>> {
    await this.operations.execute(
      { actorId: command.actorId, workspaceId: command.workspaceId, role: WorkspaceRole.ADMIN },
      async () => {
        if (command.actorId === command.userId) {
          throw new InsufficientPermissionsError('remove yourself');
        }
        const membership = await this.service.getUserMembership(command.userId, command.workspaceId);
        if (!membership) {
          throw new MembershipNotFoundError(command.userId, command.workspaceId);
        }
        await this.service.removeMember(membership.id.getValue());
      }
    );
    return CommandResult.success();
  }
}
