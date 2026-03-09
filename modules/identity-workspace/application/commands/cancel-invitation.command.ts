import { WorkspaceInvitationService } from '../services/workspace-invitation.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

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
      if (error instanceof Error) {
        return CommandResult.failure<void>(error.message, [error.message]);
      }
      return CommandResult.failure<void>('Failed to cancel invitation');
    }
  }
}
