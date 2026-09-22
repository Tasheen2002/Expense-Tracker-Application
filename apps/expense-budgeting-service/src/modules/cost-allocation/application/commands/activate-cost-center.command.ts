import { AllocationManagementService } from '../services/allocation-management.service';
import { CostCenterDTO } from '../../domain/entities/cost-center.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface ActivateCostCenterCommand extends ICommand {
  readonly id: string;
  readonly workspaceId: string;
  readonly actorId: string;
}

export class ActivateCostCenterHandler implements ICommandHandler<
  ActivateCostCenterCommand,
  CommandResult<CostCenterDTO>
> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(
    command: ActivateCostCenterCommand
  ): Promise<CommandResult<CostCenterDTO>> {
    const dto = await this.allocationManagementService.activateCostCenter(
      command.id,
      command.workspaceId,
      command.actorId
    );
    return CommandResult.success(dto);
  }
}
