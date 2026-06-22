import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';
import { WorkspaceMembershipService } from '../services/workspace-membership.service';
import { MembershipNotFoundError } from '../../domain/errors/identity.errors';

export interface RemoveMemberCommand extends ICommand {
  readonly workspaceId: string;
  readonly userId: string;
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

      await this.membershipService.removeMember(membership.id.getValue());
      return CommandResult.success(undefined);
    } catch (error) {
      return CommandResult.fromError(error);
    }
  }
}
