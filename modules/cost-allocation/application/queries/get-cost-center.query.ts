import { AllocationManagementService } from '../services/allocation-management.service'
import { CostCenter } from '../../domain/entities/cost-center.entity'

export class GetCostCenterQuery {
  constructor(
    public readonly id: string
  ) {}
}

export class GetCostCenterHandler {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(query: GetCostCenterQuery): Promise<CostCenter> {
    return await this.allocationManagementService.getCostCenter(query.id)
  }
}
