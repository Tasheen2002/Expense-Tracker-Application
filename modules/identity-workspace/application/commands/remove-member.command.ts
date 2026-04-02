import { ICommand, ICommandHandler } from '../../../../apps/api/src/shared/application/cqrs';
import { CommandResult } from '../../../../apps/api/src/shared/application/command-result';
import { WorkspaceMembershipService } from '../services/workspace-membership.service';
import { MembershipNotFoundError } from '../../domain/errors/identity.errors';

export interface RemoveMemberCommand extends ICommand {
  workspaceId: string;
  userId: string; // The user to remove
}

export class RemoveMemberHandler implements ICommandHandler<
  RemoveMemberCommand,
  CommandResult<void>
> {
  constructor(private readonly membershipService: WorkspaceMembershipService) {}

  async handle(command: RemoveMemberCommand): Promise<CommandResult<void>> {
    try {
      const membership = await this.membershipService.getUserMembership(
        command.userId,
        command.workspaceId
      );

      if (!membership) {
        throw new MembershipNotFoundError(command.userId);
      }

      await this.membershipService.removeMember(membership.getId().getValue());
      return CommandResult.success(undefined);
    } catch (error) {
      return CommandResult.fromError(error);
    }
  }
}
