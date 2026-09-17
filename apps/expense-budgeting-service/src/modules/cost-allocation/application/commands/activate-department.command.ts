import { AllocationManagementService } from '../services/allocation-management.service';
import { DepartmentDTO } from '../../domain/entities/department.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface ActivateDepartmentCommand extends ICommand {
  readonly id: string;
  readonly workspaceId: string;
  readonly actorId: string;
}

export class ActivateDepartmentHandler implements ICommandHandler<
  ActivateDepartmentCommand,
  CommandResult<DepartmentDTO>
> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(
    command: ActivateDepartmentCommand
  ): Promise<CommandResult<DepartmentDTO>> {
    const dto = await this.allocationManagementService.activateDepartment(
      command.id,
      command.workspaceId,
      command.actorId
    );
    return CommandResult.success(dto);
  }
}
