import { AllocationManagementService } from '../services/allocation-management.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface DeleteProjectCommand extends ICommand {
  id: string;
  workspaceId: string;
  actorId: string;
}

export class DeleteProjectHandler implements ICommandHandler<
  DeleteProjectCommand,
  CommandResult<void>
> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(command: DeleteProjectCommand): Promise<CommandResult<void>> {
    await this.allocationManagementService.deleteProject(
      command.id,
      command.workspaceId,
      command.actorId
    );
    return CommandResult.success(undefined);
  }
}
