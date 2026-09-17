import { AllocationManagementService } from '../services/allocation-management.service';
import { CostCenterDTO } from '../../domain/entities/cost-center.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface UpdateCostCenterCommand extends ICommand {
  readonly id: string;
  readonly workspaceId: string;
  readonly actorId: string;
  readonly name?: string;
  readonly code?: string;
  readonly description?: string | null;
}

export class UpdateCostCenterHandler implements ICommandHandler<
  UpdateCostCenterCommand,
  CommandResult<CostCenterDTO>
> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(command: UpdateCostCenterCommand): Promise<CommandResult<CostCenterDTO>> {
    const dto = await this.allocationManagementService.updateCostCenter({
      id: command.id,
      workspaceId: command.workspaceId,
      actorId: command.actorId,
      name: command.name,
      code: command.code,
      description: command.description,
    });
    return CommandResult.success(dto);
  }
}
