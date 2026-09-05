import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';
import { WorkspaceManagementService } from '../services/workspace-management.service';
import { OperationService } from '../services/operation.service';
import { WorkspaceRole } from '../../domain/entities/workspace-membership.entity';
import { WorkspaceDTO } from '../../domain/entities/workspace.entity';

export interface UpdateWorkspaceCommand extends ICommand {
  readonly actorId: string;
  readonly workspaceId: string;
  readonly name?: string;
}

export class UpdateWorkspaceHandler implements ICommandHandler<UpdateWorkspaceCommand, CommandResult<WorkspaceDTO>> {
  constructor(
    private readonly service: WorkspaceManagementService,
    private readonly operations: OperationService
  ) {}

  async handle(command: UpdateWorkspaceCommand): Promise<CommandResult<WorkspaceDTO>> {
    const data = await this.operations.execute(
      { actorId: command.actorId, workspaceId: command.workspaceId, role: WorkspaceRole.ADMIN },
      async () => {
        return this.service.updateWorkspaceDTO(command.workspaceId, {
          ...(command.name !== undefined ? { name: command.name } : {}),
        });
      }
    );
    return CommandResult.success(data);
  }
}
