import { AllocationManagementService } from '../services/allocation-management.service'
import { Department } from '../../domain/entities/department.entity'

export class ListDepartmentsQuery {
  constructor(
    public readonly workspaceId: string
  ) {}
}

export class ListDepartmentsHandler {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(query: ListDepartmentsQuery): Promise<Department[]> {
    return await this.allocationManagementService.listDepartments(query.workspaceId)
  }
}
