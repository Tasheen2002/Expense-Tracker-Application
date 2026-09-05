import { AllocationManagementService } from '../services/allocation-management.service';
import { CostCenterDTO } from '../../domain/entities/cost-center.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface CreateCostCenterCommand extends ICommand {
  readonly workspaceId: string;
  readonly actorId: string;
  readonly name: string;
  readonly code: string;
  readonly description?: string;
}

export class CreateCostCenterHandler implements ICommandHandler<
  CreateCostCenterCommand,
  CommandResult<CostCenterDTO>
> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(
    command: CreateCostCenterCommand
  ): Promise<CommandResult<CostCenterDTO>> {
    const dto = await this.allocationManagementService.createCostCenter({
      workspaceId: command.workspaceId,
      actorId: command.actorId,
      name: command.name,
      code: command.code,
      description: command.description,
    });
    return CommandResult.success(dto);
  }
}
