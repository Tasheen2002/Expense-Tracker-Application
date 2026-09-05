import { AllocationManagementService } from '../services/allocation-management.service';
import { DepartmentDTO } from '../../domain/entities/department.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface UpdateDepartmentCommand extends ICommand {
  readonly id: string;
  readonly workspaceId: string;
  readonly actorId: string;
  readonly name?: string;
  readonly code?: string;
  readonly description?: string | null;
  readonly managerId?: string | null;
  readonly parentDepartmentId?: string | null;
}

export class UpdateDepartmentHandler implements ICommandHandler<
  UpdateDepartmentCommand,
  CommandResult<DepartmentDTO>
> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(command: UpdateDepartmentCommand): Promise<CommandResult<DepartmentDTO>> {
    const dto = await this.allocationManagementService.updateDepartment({
      id: command.id,
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
