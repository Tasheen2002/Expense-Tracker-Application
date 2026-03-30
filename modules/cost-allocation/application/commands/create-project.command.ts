import { AllocationManagementService } from '../services/allocation-management.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface CreateProjectCommand extends ICommand {
  workspaceId: string;
  actorId: string;
  name: string;
  code: string;
  startDate: string | Date;
  description?: string;
  endDate?: string | Date;
  managerId?: string;
  budget?: number;
}

export class CreateProjectHandler implements ICommandHandler<
  CreateProjectCommand,
  CommandResult<{ projectId: string }>
> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(
    command: CreateProjectCommand
  ): Promise<CommandResult<{ projectId: string }>> {
    const project = await this.allocationManagementService.createProject({
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
    return CommandResult.success({ projectId: project.getId().getValue() });
  }
}
