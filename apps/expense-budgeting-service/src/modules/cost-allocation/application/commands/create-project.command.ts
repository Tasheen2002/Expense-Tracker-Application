import { AllocationManagementService } from '../services/allocation-management.service';
import { ProjectDTO } from '../../domain/entities/project.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface CreateProjectCommand extends ICommand {
  readonly workspaceId: string;
  readonly actorId: string;
  readonly name: string;
  readonly code: string;
  readonly startDate: string | Date;
  readonly description?: string;
  readonly endDate?: string | Date;
  readonly managerId?: string;
  readonly budget?: number;
}

export class CreateProjectHandler implements ICommandHandler<
  CreateProjectCommand,
  CommandResult<ProjectDTO>
> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(
    command: CreateProjectCommand
  ): Promise<CommandResult<ProjectDTO>> {
    const dto = await this.allocationManagementService.createProject({
      workspaceId: command.workspaceId,
      actorId: command.actorId,
      name: command.name,
      code: command.code,
      startDate: command.startDate,
      description: command.description,
      endDate: command.endDate,
      managerId: command.managerId,
      budget: command.budget,
    });
    return CommandResult.success(dto);
  }
}
