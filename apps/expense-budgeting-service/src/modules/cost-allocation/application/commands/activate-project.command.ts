import { AllocationManagementService } from '../services/allocation-management.service';
import { ProjectDTO } from '../../domain/entities/project.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface ActivateProjectCommand extends ICommand {
  readonly id: string;
  readonly workspaceId: string;
  readonly actorId: string;
}

export class ActivateProjectHandler implements ICommandHandler<
  ActivateProjectCommand,
  CommandResult<ProjectDTO>
> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(command: ActivateProjectCommand): Promise<CommandResult<ProjectDTO>> {
    const dto = await this.allocationManagementService.activateProject(
      command.id,
      command.workspaceId,
      command.actorId
    );
    return CommandResult.success(dto);
  }
}
