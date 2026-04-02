import { AllocationManagementService } from '../services/allocation-management.service';
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
  CommandResult<void>
> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(command: UpdateCostCenterCommand): Promise<CommandResult<void>> {
    await this.allocationManagementService.updateCostCenter({
      id: command.id,
      workspaceId: command.workspaceId,
      actorId: command.actorId,
      name: command.name,
      code: command.code,
      description: command.description,
    });
    return CommandResult.success(undefined);
  }
}
