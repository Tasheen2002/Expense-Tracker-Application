import { AllocationManagementService } from '../services/allocation-management.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface ActivateProjectCommand extends ICommand {
  id: string;
  workspaceId: string;
  actorId: string;
}

export class ActivateProjectHandler implements ICommandHandler<
  ActivateProjectCommand,
  CommandResult<void>
> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(command: ActivateProjectCommand): Promise<CommandResult<void>> {
    await this.allocationManagementService.activateProject(
      command.id,
      command.workspaceId,
      command.actorId
    );
    return CommandResult.success(undefined);
  }
}
