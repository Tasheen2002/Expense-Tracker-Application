import { WorkspaceManagementService } from '../services/workspace-management.service';
import { WorkspaceDTO } from '../../domain/entities/workspace.entity';
import { WorkspaceNotFoundError } from '../../domain/errors/identity.errors';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface UpdateWorkspaceCommand extends ICommand {
  readonly workspaceId: string;
  readonly name?: string;
}

export class UpdateWorkspaceHandler implements ICommandHandler<
  UpdateWorkspaceCommand,
  CommandResult<WorkspaceDTO>
> {
  constructor(
    private readonly workspaceManagementService: WorkspaceManagementService
  ) {}

  async handle(command: UpdateWorkspaceCommand): Promise<CommandResult<WorkspaceDTO>> {
    try {
      const updateData: { name?: string } = {};
      if (command.name !== undefined) {
        updateData.name = command.name;
      }

      const workspaceDTO = await this.workspaceManagementService.updateWorkspaceDTO(
        command.workspaceId,
        updateData
      );

      if (!workspaceDTO) {
        throw new WorkspaceNotFoundError(command.workspaceId);
      }

      return CommandResult.success(workspaceDTO);
    } catch (error) {
      return CommandResult.fromError(error);
    }
  }
}
