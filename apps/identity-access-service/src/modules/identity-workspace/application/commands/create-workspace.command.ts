import { WorkspaceManagementService } from '../services/workspace-management.service';
import { WorkspaceDTO } from '../../domain/entities/workspace.entity';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface CreateWorkspaceCommand extends ICommand {
  readonly name: string;
  readonly ownerId: string;
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
