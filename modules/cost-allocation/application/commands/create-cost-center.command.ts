import { AllocationManagementService } from '../services/allocation-management.service'
import { CostCenter } from '../../domain/entities/cost-center.entity'

export class CreateCostCenterCommand {
  constructor(
    public readonly workspaceId: string,
    public readonly name: string,
    public readonly code: string,
    public readonly description?: string
  ) {}
}

export class CreateCostCenterHandler {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(command: CreateCostCenterCommand): Promise<CostCenter> {
    return await this.allocationManagementService.createCostCenter({
      workspaceId: command.workspaceId,
      name: command.name,
      code: command.code,
      description: command.description,
    })
  }
}
