import { WorkspaceManagementService } from '../services/workspace-management.service';
import { ICommand, ICommandHandler } from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface CreateWorkspaceCommand extends ICommand {
  name: string;
  ownerId: string;
}

export class CreateWorkspaceHandler implements ICommandHandler<
  CreateWorkspaceCommand,
  CommandResult<{ workspaceId: string }>
> {
  constructor(
    private readonly workspaceManagementService: WorkspaceManagementService
  ) {}

  async handle(
    command: CreateWorkspaceCommand
  ): Promise<CommandResult<{ workspaceId: string }>> {
    try {
      const workspace = await this.workspaceManagementService.createWorkspace({
        name: command.name,
        ownerId: command.ownerId,
      });
      return CommandResult.success({
        workspaceId: workspace.getId().getValue(),
      });
    } catch (error) {
      return CommandResult.fromError(error);
    }
  }
}
