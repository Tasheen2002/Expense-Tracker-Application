import { AllocationManagementService } from '../services/allocation-management.service'
import { Project } from '../../domain/entities/project.entity'

export class UpdateProjectCommand {
  constructor(
    public readonly id: string,
    public readonly workspaceId: string,
    public readonly name?: string,
    public readonly code?: string,
    public readonly description?: string | null,
    public readonly startDate?: string | Date,
    public readonly endDate?: string | Date | null,
    public readonly managerId?: string | null,
    public readonly budget?: number | null
  ) {}
}

export class UpdateProjectHandler {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(command: UpdateProjectCommand): Promise<Project> {
    return await this.allocationManagementService.updateProject({
      id: command.id,
      workspaceId: command.workspaceId,
      name: command.name,
      code: command.code,
      description: command.description,
      startDate: command.startDate,
      endDate: command.endDate,
      managerId: command.managerId,
      budget: command.budget,
    })
  }
}
