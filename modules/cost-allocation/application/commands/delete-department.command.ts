import { AllocationManagementService } from '../services/allocation-management.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface DeleteDepartmentCommand extends ICommand {
  id: string;
  workspaceId: string;
  actorId: string;
}

export class DeleteDepartmentHandler implements ICommandHandler<
  DeleteDepartmentCommand,
  CommandResult<void>
> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(command: DeleteDepartmentCommand): Promise<CommandResult<void>> {
    await this.allocationManagementService.deleteDepartment(
      command.id,
      command.workspaceId,
      command.actorId
    );
    return CommandResult.success(undefined);
  }
}
