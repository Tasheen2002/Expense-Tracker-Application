import { AllocationManagementService } from '../services/allocation-management.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface CreateDepartmentCommand extends ICommand {
  workspaceId: string;
  actorId: string;
  name: string;
  code: string;
  description?: string;
  managerId?: string;
  parentDepartmentId?: string;
}

export class CreateDepartmentHandler implements ICommandHandler<
  CreateDepartmentCommand,
  CommandResult<{ departmentId: string }>
> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(
    command: CreateDepartmentCommand
  ): Promise<CommandResult<{ departmentId: string }>> {
    const department = await this.allocationManagementService.createDepartment({
      workspaceId: command.workspaceId,
      actorId: command.actorId,
      name: command.name,
      code: command.code,
      description: command.description,
      managerId: command.managerId,
      parentDepartmentId: command.parentDepartmentId,
    });
    return CommandResult.success({
      departmentId: department.getId().getValue(),
    });
  }
}
