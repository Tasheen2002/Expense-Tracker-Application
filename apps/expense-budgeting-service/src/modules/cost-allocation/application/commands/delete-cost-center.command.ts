import { AllocationManagementService } from '../services/allocation-management.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface DeleteCostCenterCommand extends ICommand {
  readonly id: string;
  readonly workspaceId: string;
  readonly actorId: string;
}

export class DeleteCostCenterHandler implements ICommandHandler<
  DeleteCostCenterCommand,
  CommandResult<void>
> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(command: DeleteCostCenterCommand): Promise<CommandResult<void>> {
    await this.allocationManagementService.deleteCostCenter(
      command.id,
      command.workspaceId,
      command.actorId
    );
    return CommandResult.success(undefined);
  }
}
