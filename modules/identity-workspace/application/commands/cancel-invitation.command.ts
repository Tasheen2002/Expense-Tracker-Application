import { WorkspaceInvitationService } from '../services/workspace-invitation.service';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface CancelInvitationCommand extends ICommand {
  readonly invitationId: string;
}

export class CancelInvitationHandler implements ICommandHandler<
  CancelInvitationCommand,
  CommandResult<void>
> {
  constructor(private readonly invitationService: WorkspaceInvitationService) {}

  async handle(command: CancelInvitationCommand): Promise<CommandResult<void>> {
    try {
      await this.invitationService.cancelInvitation(command.invitationId);
      return CommandResult.success(undefined);
    } catch (error) {
      return CommandResult.fromError(error);
    }
  }
}
