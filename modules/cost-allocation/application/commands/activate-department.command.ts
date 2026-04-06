import { AllocationManagementService } from '../services/allocation-management.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface ActivateDepartmentCommand extends ICommand {
  id: string;
  workspaceId: string;
  actorId: string;
}

export class ActivateDepartmentHandler implements ICommandHandler<
  ActivateDepartmentCommand,
  CommandResult<void>
> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(
    command: ActivateDepartmentCommand
  ): Promise<CommandResult<void>> {
    await this.allocationManagementService.activateDepartment(
      command.id,
      command.workspaceId,
      command.actorId
    );
    return CommandResult.success(undefined);
  }
}
