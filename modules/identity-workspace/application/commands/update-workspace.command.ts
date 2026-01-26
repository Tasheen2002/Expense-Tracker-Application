import { WorkspaceManagementService } from '../services/workspace-management.service'
import { Workspace } from '../../domain/entities/workspace.entity'
import { ICommand, ICommandHandler, CommandResult } from './register-user.command'

export interface UpdateWorkspaceCommand extends ICommand {
  workspaceId: string
  name?: string
}

export class UpdateWorkspaceHandler
  implements ICommandHandler<UpdateWorkspaceCommand, CommandResult<Workspace>>
{
  constructor(private readonly workspaceManagementService: WorkspaceManagementService) {}

  async handle(command: UpdateWorkspaceCommand): Promise<CommandResult<Workspace>> {
    try {
      // Validate workspaceId
      if (!command.workspaceId || typeof command.workspaceId !== 'string') {
        return CommandResult.failure<Workspace>('Workspace ID is required', ['workspaceId'])
      }

      // Validate name if provided
      if (command.name !== undefined && (!command.name || typeof command.name !== 'string')) {
        return CommandResult.failure<Workspace>('Workspace name must be a valid string', [
          'name',
        ])
      }

      const updateData: { name?: string } = {}
      if (command.name !== undefined) {
        updateData.name = command.name
      }

      const workspace = await this.workspaceManagementService.updateWorkspace(
        command.workspaceId,
        updateData
      )

      if (!workspace) {
        return CommandResult.failure<Workspace>('Workspace not found', ['workspaceId'])
      }

      return CommandResult.success<Workspace>(workspace)
    } catch (error) {
      if (error instanceof Error) {
        return CommandResult.failure<Workspace>(error.message, [error.message])
      }

      return CommandResult.failure<Workspace>(
        'An unexpected error occurred during workspace update'
      )
    }
  }
}
