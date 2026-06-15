import { ICommand, ICommandHandler, CommandResult } from '../../../../packages/core/src/application/cqrs';
import { WorkspaceMembershipService } from '../services/workspace-membership.service';
import {
  WorkspaceMembershipDTO,
  WorkspaceRole,
} from '../../domain/entities/workspace-membership.entity';
import { MembershipNotFoundError } from '../../domain/errors/identity.errors';

export interface ChangeMemberRoleCommand extends ICommand {
  readonly workspaceId: string;
  readonly userId: string;
  readonly role: WorkspaceRole;
}

export class ChangeMemberRoleHandler implements ICommandHandler<
  ChangeMemberRoleCommand,
  CommandResult<WorkspaceMembershipDTO>
> {
  constructor(private readonly membershipService: WorkspaceMembershipService) {}

  async handle(
    command: ChangeMemberRoleCommand
  ): Promise<CommandResult<WorkspaceMembershipDTO>> {
    try {
      const membership = await this.membershipService.getUserMembership(
        command.userId,
        command.workspaceId
      );

      if (!membership) {
        throw new MembershipNotFoundError(command.userId);
      }

      const updatedDTO = await this.membershipService.changeMemberRole(
        membership.id.getValue(),
        command.role
      );
      return CommandResult.success(updatedDTO);
    } catch (error) {
      return CommandResult.fromError(error);
    }
  }
}
