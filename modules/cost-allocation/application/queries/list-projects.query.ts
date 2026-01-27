import { AllocationManagementService } from '../services/allocation-management.service'
import { Project } from '../../domain/entities/project.entity'

export class ListProjectsQuery {
  constructor(
    public readonly workspaceId: string
  ) {}
}

export class ListProjectsHandler {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(query: ListProjectsQuery): Promise<Project[]> {
    return await this.allocationManagementService.listProjects(query.workspaceId)
  }
}
