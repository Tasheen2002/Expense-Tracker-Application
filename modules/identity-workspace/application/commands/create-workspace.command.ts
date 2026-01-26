import { WorkspaceManagementService } from '../services/workspace-management.service'
import { Workspace } from '../../domain/entities/workspace.entity'
import { ICommand, ICommandHandler, CommandResult } from './register-user.command'

export interface CreateWorkspaceCommand extends ICommand {
  name: string
  ownerId: string
}

export class CreateWorkspaceHandler
  implements ICommandHandler<CreateWorkspaceCommand, CommandResult<Workspace>>
{
  constructor(private readonly workspaceManagementService: WorkspaceManagementService) {}

  async handle(command: CreateWorkspaceCommand): Promise<CommandResult<Workspace>> {
    try {
      // Validate name
      if (!command.name || typeof command.name !== 'string') {
        return CommandResult.failure<Workspace>('Workspace name is required', ['name'])
      }

      // Validate ownerId
      if (!command.ownerId || typeof command.ownerId !== 'string') {
        return CommandResult.failure<Workspace>('Owner ID is required', ['ownerId'])
      }

      const workspaceData = {
        name: command.name,
        ownerId: command.ownerId,
      }

      const workspace = await this.workspaceManagementService.createWorkspace(workspaceData)
      return CommandResult.success<Workspace>(workspace)
    } catch (error) {
      if (error instanceof Error) {
        return CommandResult.failure<Workspace>('Workspace creation failed', [
          error.message,
        ])
      }

      return CommandResult.failure<Workspace>(
        'An unexpected error occurred during workspace creation'
      )
    }
  }
}
