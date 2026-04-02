import { AllocationManagementService } from '../services/allocation-management.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface UpdateProjectCommand extends ICommand {
  id: string;
  workspaceId: string;
  actorId: string;
  name?: string;
  code?: string;
  description?: string | null;
  startDate?: string | Date;
  endDate?: string | Date | null;
  managerId?: string | null;
  budget?: number | null;
}

export class UpdateProjectHandler implements ICommandHandler<
  UpdateProjectCommand,
  CommandResult<void>
> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(command: UpdateProjectCommand): Promise<CommandResult<void>> {
    await this.allocationManagementService.updateProject({
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
    return CommandResult.success(undefined);
  }
}
