import { AllocationManagementService } from '../services/allocation-management.service'
import { CostCenter } from '../../domain/entities/cost-center.entity'

export class ActivateCostCenterCommand {
  constructor(
    public readonly id: string
  ) {}
}

export class ActivateCostCenterHandler {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(command: ActivateCostCenterCommand): Promise<CostCenter> {
    return await this.allocationManagementService.activateCostCenter(command.id)
  }
}
