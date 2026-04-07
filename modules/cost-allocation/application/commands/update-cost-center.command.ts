import { AllocationManagementService } from '../services/allocation-management.service';
import { CostCenterDTO } from '../../domain/entities/cost-center.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface UpdateCostCenterCommand extends ICommand {
  id: string;
  workspaceId: string;
  actorId: string;
  name?: string;
  code?: string;
  description?: string | null;
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
