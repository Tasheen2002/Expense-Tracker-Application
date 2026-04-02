import { WorkspaceManagementService } from '../services/workspace-management.service';
import { WorkspaceNotFoundError } from '../../domain/errors/identity.errors';
import { ICommand, ICommandHandler } from '../../../../apps/api/src/shared/application/cqrs';
import { CommandResult } from '../../../../apps/api/src/shared/application/command-result';

export interface UpdateWorkspaceCommand extends ICommand {
  workspaceId: string;
  name?: string;
}

export class UpdateWorkspaceHandler implements ICommandHandler<
  UpdateWorkspaceCommand,
  CommandResult<void>
> {
  constructor(
    private readonly workspaceManagementService: WorkspaceManagementService
  ) {}

  async handle(command: UpdateWorkspaceCommand): Promise<CommandResult<void>> {
    try {
      const updateData: { name?: string } = {};
      if (command.name !== undefined) {
        updateData.name = command.name;
      }

      const workspace = await this.workspaceManagementService.updateWorkspace(
        command.workspaceId,
        updateData
      );

      if (!workspace) {
        throw new WorkspaceNotFoundError(command.workspaceId);
      }

      return CommandResult.success();
    } catch (error) {
      return CommandResult.fromError(error);
    }
  }
}
