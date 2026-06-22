import { AllocationManagementService } from '../services/allocation-management.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface DeleteDepartmentCommand extends ICommand {
  readonly id: string;
  readonly workspaceId: string;
  readonly actorId: string;
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
