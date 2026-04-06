import { WorkspaceInvitationService } from '../services/workspace-invitation.service';
import { ICommand, ICommandHandler } from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface CancelInvitationCommand extends ICommand {
  invitationId: string;
}

export class CancelInvitationHandler implements ICommandHandler<
  CancelInvitationCommand,
  CommandResult<void>
> {
  constructor(private readonly invitationService: WorkspaceInvitationService) {}

  async handle(command: CancelInvitationCommand): Promise<CommandResult<void>> {
    try {
      await this.invitationService.cancelInvitation(command.invitationId);
      return CommandResult.success<void>(undefined);
    } catch (error) {
      return CommandResult.fromError(error);
    }
  }
}
