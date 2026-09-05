import { AllocationManagementService } from '../services/allocation-management.service';
import { ProjectDTO } from '../../domain/entities/project.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface UpdateProjectCommand extends ICommand {
  readonly id: string;
  readonly workspaceId: string;
  readonly actorId: string;
  readonly name?: string;
  readonly code?: string;
  readonly description?: string | null;
  readonly startDate?: string | Date;
  readonly endDate?: string | Date | null;
  readonly managerId?: string | null;
  readonly budget?: number | null;
}

export class UpdateProjectHandler implements ICommandHandler<
  UpdateProjectCommand,
  CommandResult<ProjectDTO>
> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(command: UpdateProjectCommand): Promise<CommandResult<ProjectDTO>> {
    const dto = await this.allocationManagementService.updateProject({
      id: command.id,
      workspaceId: command.workspaceId,
      actorId: command.actorId,
      name: command.name,
      code: command.code,
      description: command.description,
      startDate: command.startDate,
      endDate: command.endDate,
      managerId: command.managerId,
      budget: command.budget,
    });
    return CommandResult.success(dto);
  }
}
