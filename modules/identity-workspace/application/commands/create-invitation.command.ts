import { WorkspaceInvitationService } from '../services/workspace-invitation.service';
import { WorkspaceInvitationDTO } from '../../domain/entities/workspace-invitation.entity';
import { WorkspaceRole } from '../../domain/entities/workspace-membership.entity';
import { ICommand, ICommandHandler } from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface CreateInvitationCommand extends ICommand {
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  invitedBy: string;
  expiryHours?: number;
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
