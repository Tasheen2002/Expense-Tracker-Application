import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';
import { WorkspaceManagementService } from '../services/workspace-management.service';
import { OperationService } from '../services/operation.service';
import { WorkspaceDTO } from '../../domain/entities/workspace.entity';

export interface CreateWorkspaceCommand extends ICommand {
  readonly name: string;
  readonly ownerId: string;
}

export class CreateWorkspaceHandler implements ICommandHandler<CreateWorkspaceCommand, CommandResult<WorkspaceDTO>> {
  constructor(
    private readonly service: WorkspaceManagementService,
    private readonly operations: OperationService
  ) {}

  async handle(command: CreateWorkspaceCommand): Promise<CommandResult<WorkspaceDTO>> {
    const data = await this.operations.execute({ actorId: command.ownerId }, async () => {
      return this.service.createWorkspaceDTO(command);
    });
    return CommandResult.success(data);
  }
}
