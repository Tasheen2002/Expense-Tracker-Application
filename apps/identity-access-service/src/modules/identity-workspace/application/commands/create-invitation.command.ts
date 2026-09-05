import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';
import { WorkspaceInvitationService } from '../services/workspace-invitation.service';
import { OperationService } from '../services/operation.service';
import { WorkspaceRole } from '../../domain/entities/workspace-membership.entity';
import { WorkspaceInvitationDTO } from '../../domain/entities/workspace-invitation.entity';
import { INVITATION_EXPIRY_HOURS } from '../../domain/constants/identity.constants';

export interface CreateInvitationCommand extends ICommand {
  readonly workspaceId: string;
  readonly email: string;
  readonly role: WorkspaceRole;
  readonly invitedBy: string;
  readonly expiryHours?: number;
}

export class CreateInvitationHandler implements ICommandHandler<CreateInvitationCommand, CommandResult<WorkspaceInvitationDTO>> {
  constructor(
    private readonly service: WorkspaceInvitationService,
    private readonly operations: OperationService
  ) {}

  async handle(command: CreateInvitationCommand): Promise<CommandResult<WorkspaceInvitationDTO>> {
    const data = await this.operations.execute(
      { actorId: command.invitedBy, workspaceId: command.workspaceId, role: WorkspaceRole.ADMIN },
      async () => {
        return this.service.createInvitationDTO({
          ...command,
          expiryHours: command.expiryHours ?? INVITATION_EXPIRY_HOURS,
        });
      }
    );
    return CommandResult.success(data);
  }
}
