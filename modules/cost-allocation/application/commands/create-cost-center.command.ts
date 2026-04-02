import { AllocationManagementService } from '../services/allocation-management.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface CreateCostCenterCommand extends ICommand {
  workspaceId: string;
  actorId: string;
  name: string;
  code: string;
  description?: string;
}

export class CreateCostCenterHandler implements ICommandHandler<
  CreateCostCenterCommand,
  CommandResult<{ costCenterId: string }>
> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(
    command: CreateCostCenterCommand
  ): Promise<CommandResult<{ costCenterId: string }>> {
    const costCenter = await this.allocationManagementService.createCostCenter({
      workspaceId: command.workspaceId,
      actorId: command.actorId,
      name: command.name,
      code: command.code,
      description: command.description,
    });
    return CommandResult.success({
      costCenterId: costCenter.getId().getValue(),
    });
  }
}
