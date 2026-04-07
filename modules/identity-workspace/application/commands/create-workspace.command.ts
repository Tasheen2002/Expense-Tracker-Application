import { WorkspaceManagementService } from '../services/workspace-management.service';
import { WorkspaceDTO } from '../../domain/entities/workspace.entity';
import { ICommand, ICommandHandler } from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface CreateWorkspaceCommand extends ICommand {
  name: string;
  ownerId: string;
}

export class CreateWorkspaceHandler implements ICommandHandler<
  CreateWorkspaceCommand,
  CommandResult<WorkspaceDTO>
> {
  constructor(
    private readonly workspaceManagementService: WorkspaceManagementService
  ) {}

  async handle(
    command: CreateWorkspaceCommand
  ): Promise<CommandResult<WorkspaceDTO>> {
    try {
      const workspaceDTO = await this.workspaceManagementService.createWorkspaceDTO({
        name: command.name,
        ownerId: command.ownerId,
      });
      return CommandResult.success(workspaceDTO);
    } catch (error) {
      return CommandResult.fromError(error);
    }
  }
}
