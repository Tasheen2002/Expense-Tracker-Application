import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';
import { WorkspaceInvitationService } from '../services/workspace-invitation.service';
import { OperationService } from '../services/operation.service';
import { WorkspaceRole } from '../../domain/entities/workspace-membership.entity';

export interface CancelInvitationCommand extends ICommand {
  readonly actorId: string;
  readonly workspaceId: string;
  readonly invitationId: string;
}

export class CancelInvitationHandler implements ICommandHandler<CancelInvitationCommand, CommandResult<void>> {
  constructor(
    private readonly service: WorkspaceInvitationService,
    private readonly operations: OperationService
  ) {}

  async handle(command: CancelInvitationCommand): Promise<CommandResult<void>> {
    await this.operations.execute(
      { actorId: command.actorId, workspaceId: command.workspaceId, role: WorkspaceRole.ADMIN },
      async () => {
        await this.service.cancelInvitation(command.invitationId, command.workspaceId);
      }
    );
    return CommandResult.success();
  }
}