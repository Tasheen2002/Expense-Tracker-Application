import { ICommand, ICommandHandler } from '../../../../apps/api/src/shared/application/cqrs';
import { CommandResult } from '../../../../apps/api/src/shared/application/command-result';
import { WorkspaceMembershipService } from '../services/workspace-membership.service';
import {
  WorkspaceMembership,
  WorkspaceRole,
} from '../../domain/entities/workspace-membership.entity';
import { MembershipNotFoundError } from '../../domain/errors/identity.errors';

export interface ChangeMemberRoleCommand extends ICommand {
  workspaceId: string;
  userId: string; // The user whose role to change
  role: WorkspaceRole;
}

export class ChangeMemberRoleHandler implements ICommandHandler<
  ChangeMemberRoleCommand,
  CommandResult<WorkspaceMembership>
> {
  constructor(private readonly membershipService: WorkspaceMembershipService) {}

  async handle(
    command: ChangeMemberRoleCommand
  ): Promise<CommandResult<WorkspaceMembership>> {
    try {
      const membership = await this.membershipService.getUserMembership(
        command.userId,
        command.workspaceId
      );

      if (!membership) {
        throw new MembershipNotFoundError(command.userId);
      }

      const updated = await this.membershipService.changeMemberRole(
        membership.getId().getValue(),
        command.role
      );
      return CommandResult.success(updated);
    } catch (error) {
      return CommandResult.fromError(error);
    }
  }
}
