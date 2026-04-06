import { AllocationManagementService } from '../services/allocation-management.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface UpdateDepartmentCommand extends ICommand {
  id: string;
  workspaceId: string;
  actorId: string;
  name?: string;
  code?: string;
  description?: string | null;
  managerId?: string | null;
  parentDepartmentId?: string | null;
}

export class UpdateDepartmentHandler implements ICommandHandler<
  UpdateDepartmentCommand,
  CommandResult<void>
> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(command: UpdateDepartmentCommand): Promise<CommandResult<void>> {
    await this.allocationManagementService.updateDepartment({
      id: command.id,
      workspaceId: command.workspaceId,
      actorId: command.actorId,
      name: command.name,
      code: command.code,
      description: command.description,
      managerId: command.managerId,
      parentDepartmentId: command.parentDepartmentId,
    });
    return CommandResult.success(undefined);
  }
}
