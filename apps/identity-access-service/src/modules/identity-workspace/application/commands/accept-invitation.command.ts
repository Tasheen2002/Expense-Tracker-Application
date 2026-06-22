import { WorkspaceInvitationService } from '../services/workspace-invitation.service';
import { WorkspaceMembershipDTO } from '../../domain/entities/workspace-membership.entity';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface AcceptInvitationCommand extends ICommand {
  readonly token: string;
  readonly userId: string;
}

export class AcceptInvitationHandler implements ICommandHandler<
  AcceptInvitationCommand,
  CommandResult<WorkspaceMembershipDTO>
> {
  constructor(private readonly invitationService: WorkspaceInvitationService) {}

  async handle(
    command: AcceptInvitationCommand
  ): Promise<CommandResult<WorkspaceMembershipDTO>> {
    try {
      const membershipDTO = await this.invitationService.acceptInvitationDTO(
        command.token,
        command.userId
      );

      return CommandResult.success(membershipDTO);
    } catch (error) {
      return CommandResult.fromError(error);
    }
  }
}
