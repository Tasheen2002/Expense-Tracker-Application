import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';
import { WorkspaceManagementService } from '../services/workspace-management.service';
import { OperationService } from '../services/operation.service';
import { WorkspaceRole } from '../../domain/entities/workspace-membership.entity';

export interface DeleteWorkspaceCommand extends ICommand {
  readonly actorId: string;
  readonly workspaceId: string;
}

export class DeleteWorkspaceHandler implements ICommandHandler<DeleteWorkspaceCommand, CommandResult<void>> {
  constructor(
    private readonly service: WorkspaceManagementService,
    private readonly operations: OperationService
  ) {}

  async handle(command: DeleteWorkspaceCommand): Promise<CommandResult<void>> {
    await this.operations.execute(
      { actorId: command.actorId, workspaceId: command.workspaceId, role: WorkspaceRole.OWNER },
      async () => {
        await this.service.deleteWorkspace(command.workspaceId);
      }
    );
    return CommandResult.success();
  }
}
