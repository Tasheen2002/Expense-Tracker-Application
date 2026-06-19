import { WorkspaceInvitationService } from '../services/workspace-invitation.service';
import { WorkspaceInvitationDTO } from '../../domain/entities/workspace-invitation.entity';
import { WorkspaceRole } from '../../domain/entities/workspace-membership.entity';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface CreateInvitationCommand extends ICommand {
  readonly workspaceId: string;
  readonly email: string;
  readonly role: WorkspaceRole;
  readonly invitedBy: string;
  readonly expiryHours?: number;
}

export class CreateInvitationHandler implements ICommandHandler<
  CreateInvitationCommand,
  CommandResult<WorkspaceInvitationDTO>
> {
  constructor(private readonly invitationService: WorkspaceInvitationService) {}

  async handle(
    command: CreateInvitationCommand
  ): Promise<CommandResult<WorkspaceInvitationDTO>> {
    try {
      const invitationDTO = await this.invitationService.createInvitationDTO({
        workspaceId: command.workspaceId,
        email: command.email,
        role: command.role,
        expiryHours: command.expiryHours ?? 168,
      });

      return CommandResult.success(invitationDTO);
    } catch (error) {
      return CommandResult.fromError(error);
    }
  }
}
