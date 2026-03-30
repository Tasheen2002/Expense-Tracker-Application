import { WorkspaceInvitationService } from '../services/workspace-invitation.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface AcceptInvitationCommand extends ICommand {
  token: string;
  userId: string;
}

export type AcceptInvitationResultType = {
  membershipId: string;
  workspaceId: string;
  userId: string;
  role: string;
};

export class AcceptInvitationHandler implements ICommandHandler<
  AcceptInvitationCommand,
  CommandResult<AcceptInvitationResultType>
> {
  constructor(private readonly invitationService: WorkspaceInvitationService) {}

  async handle(
    command: AcceptInvitationCommand
  ): Promise<CommandResult<AcceptInvitationResultType>> {
    try {
      const membership = await this.invitationService.acceptInvitation(
        command.token,
        command.userId
      );

      return CommandResult.success({
        membershipId: membership.getId().getValue(),
        workspaceId: membership.getWorkspaceId().getValue(),
        userId: membership.getUserId().getValue(),
        role: membership.getRole(),
      });
    } catch (error) {
      return CommandResult.fromError(error);
    }
  }
}
