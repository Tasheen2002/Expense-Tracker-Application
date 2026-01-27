import { AllocationManagementService } from '../services/allocation-management.service'
import { Department } from '../../domain/entities/department.entity'

export class GetDepartmentQuery {
  constructor(
    public readonly id: string
  ) {}
}

export class GetDepartmentHandler {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(query: GetDepartmentQuery): Promise<Department> {
    return await this.allocationManagementService.getDepartment(query.id)
  }
}
