import { AllocationManagementService } from '../services/allocation-management.service'
import { CostCenter } from '../../domain/entities/cost-center.entity'

export class ListCostCentersQuery {
  constructor(
    public readonly workspaceId: string
  ) {}
}

export class ListCostCentersHandler {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(query: ListCostCentersQuery): Promise<CostCenter[]> {
    return await this.allocationManagementService.listCostCenters(query.workspaceId)
  }
}
