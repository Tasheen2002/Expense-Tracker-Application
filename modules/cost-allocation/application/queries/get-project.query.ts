import { AllocationManagementService } from '../services/allocation-management.service'
import { Project } from '../../domain/entities/project.entity'

export class GetProjectQuery {
  constructor(
    public readonly id: string
  ) {}
}

export class GetProjectHandler {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(query: GetProjectQuery): Promise<Project> {
    return await this.allocationManagementService.getProject(query.id)
  }
}
