import { WorkspaceInvitationService } from '../services/workspace-invitation.service';
import { WorkspaceRole } from '../../domain/entities/workspace-membership.entity';
import { ICommand, ICommandHandler } from '../../../../apps/api/src/shared/application/cqrs';
import { CommandResult } from '../../../../apps/api/src/shared/application/command-result';

export interface CreateInvitationCommand extends ICommand {
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  invitedBy: string;
  expiryHours?: number;
}

export type CreateInvitationResultType = {
  invitationId: string;
  token: string;
  email: string;
  expiresAt: Date;
};

export class CreateInvitationHandler implements ICommandHandler<
  CreateInvitationCommand,
  CommandResult<CreateInvitationResultType>
> {
  constructor(private readonly invitationService: WorkspaceInvitationService) {}

  async handle(
    command: CreateInvitationCommand
  ): Promise<CommandResult<CreateInvitationResultType>> {
    try {
      const invitation = await this.invitationService.createInvitation({
        workspaceId: command.workspaceId,
        email: command.email,
        role: command.role,
        expiryHours: command.expiryHours ?? 168, // Default: 168 hours (7 days)
      });

      return CommandResult.success({
        invitationId: invitation.getId().getValue(),
        token: invitation.getToken(),
        email: invitation.getEmail(),
        expiresAt: invitation.getExpiresAt(),
      });
    } catch (error) {
      return CommandResult.fromError(error);
    }
  }
}
