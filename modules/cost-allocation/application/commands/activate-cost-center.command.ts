import { AllocationManagementService } from '../services/allocation-management.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface ActivateCostCenterCommand extends ICommand {
  id: string;
  workspaceId: string;
  actorId: string;
}

export class ActivateCostCenterHandler implements ICommandHandler<
  ActivateCostCenterCommand,
  CommandResult<void>
> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(
    command: ActivateCostCenterCommand
  ): Promise<CommandResult<void>> {
    await this.allocationManagementService.activateCostCenter(
      command.id,
      command.workspaceId,
      command.actorId
    );
    return CommandResult.success(undefined);
  }
}
