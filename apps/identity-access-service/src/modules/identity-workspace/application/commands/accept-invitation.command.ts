import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';
import { WorkspaceInvitationService } from '../services/workspace-invitation.service';
import { OperationService } from '../services/operation.service';
import { WorkspaceMembershipDTO } from '../../domain/entities/workspace-membership.entity';

export interface AcceptInvitationCommand extends ICommand {
  readonly token: string;
  readonly userId: string;
}

export class AcceptInvitationHandler implements ICommandHandler<AcceptInvitationCommand, CommandResult<WorkspaceMembershipDTO>> {
  constructor(
    private readonly service: WorkspaceInvitationService,
    private readonly operations: OperationService
  ) {}

  async handle(command: AcceptInvitationCommand): Promise<CommandResult<WorkspaceMembershipDTO>> {
    const data = await this.operations.execute({ actorId: command.userId }, async () => {
      return this.service.acceptInvitationDTO(command.token, command.userId);
    });
    return CommandResult.success(data);
  }
}
