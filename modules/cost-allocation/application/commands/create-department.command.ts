import { AllocationManagementService } from '../services/allocation-management.service';
import { DepartmentDTO } from '../../domain/entities/department.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface CreateDepartmentCommand extends ICommand {
  readonly workspaceId: string;
  readonly actorId: string;
  readonly name: string;
  readonly code: string;
  readonly description?: string;
  readonly managerId?: string;
  readonly parentDepartmentId?: string;
}

export class CreateDepartmentHandler implements ICommandHandler<
  CreateDepartmentCommand,
  CommandResult<DepartmentDTO>
> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(
    command: CreateDepartmentCommand
  ): Promise<CommandResult<DepartmentDTO>> {
    const dto = await this.allocationManagementService.createDepartment({
      workspaceId: command.workspaceId,
      actorId: command.actorId,
      name: command.name,
      code: command.code,
      description: command.description,
      managerId: command.managerId,
      parentDepartmentId: command.parentDepartmentId,
    });
    return CommandResult.success(dto);
  }
}
