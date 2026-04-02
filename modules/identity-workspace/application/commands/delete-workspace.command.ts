import { WorkspaceManagementService } from '../services/workspace-management.service';
import { WorkspaceNotFoundError } from '../../domain/errors/identity.errors';
import { ICommand, ICommandHandler } from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface DeleteWorkspaceCommand extends ICommand {
  workspaceId: string;
}

export class DeleteWorkspaceHandler implements ICommandHandler<
  DeleteWorkspaceCommand,
  CommandResult<void>
> {
  constructor(
    private readonly workspaceManagementService: WorkspaceManagementService
  ) {}

  async handle(command: DeleteWorkspaceCommand): Promise<CommandResult<void>> {
    try {
      const deleted = await this.workspaceManagementService.deleteWorkspace(
        command.workspaceId
      );

      if (!deleted) {
        throw new WorkspaceNotFoundError(command.workspaceId);
      }

      return CommandResult.success();
    } catch (error) {
      return CommandResult.fromError(error);
    }
  }
}
