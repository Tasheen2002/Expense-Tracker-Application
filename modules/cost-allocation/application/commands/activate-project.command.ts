import { AllocationManagementService } from '../services/allocation-management.service'
import { Project } from '../../domain/entities/project.entity'

export class ActivateProjectCommand {
  constructor(
    public readonly id: string
  ) {}
}

export class ActivateProjectHandler {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(command: ActivateProjectCommand): Promise<Project> {
    return await this.allocationManagementService.activateProject(command.id)
  }
}
