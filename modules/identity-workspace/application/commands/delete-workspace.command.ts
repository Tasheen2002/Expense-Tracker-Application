import { WorkspaceManagementService } from '../services/workspace-management.service'
import { ICommand, ICommandHandler, CommandResult } from './register-user.command'

export interface DeleteWorkspaceCommand extends ICommand {
  workspaceId: string
}

export class DeleteWorkspaceHandler
  implements ICommandHandler<DeleteWorkspaceCommand, CommandResult<boolean>>
{
  constructor(private readonly workspaceManagementService: WorkspaceManagementService) {}

  async handle(command: DeleteWorkspaceCommand): Promise<CommandResult<boolean>> {
    try {
      // Validate workspaceId
      if (!command.workspaceId || typeof command.workspaceId !== 'string') {
        return CommandResult.failure<boolean>('Workspace ID is required', ['workspaceId'])
      }

      const deleted = await this.workspaceManagementService.deleteWorkspace(command.workspaceId)

      if (!deleted) {
        return CommandResult.failure<boolean>('Workspace not found', ['workspaceId'])
      }

      return CommandResult.success<boolean>(deleted)
    } catch (error) {
      if (error instanceof Error) {
        return CommandResult.failure<boolean>(error.message, [error.message])
      }

      return CommandResult.failure<boolean>(
        'An unexpected error occurred during workspace deletion'
      )
    }
  }
}
