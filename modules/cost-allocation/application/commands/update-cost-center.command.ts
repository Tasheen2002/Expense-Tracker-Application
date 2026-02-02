import { AllocationManagementService } from "../services/allocation-management.service";
import { CostCenter } from "../../domain/entities/cost-center.entity";

export class UpdateCostCenterCommand {
  constructor(
    public readonly id: string,
    public readonly workspaceId: string,
    public readonly actorId: string,
    public readonly name?: string,
    public readonly code?: string,
    public readonly description?: string | null,
  ) {}
}

export class UpdateCostCenterHandler {
  constructor(
    private readonly allocationManagementService: AllocationManagementService,
  ) {}

  async handle(command: UpdateCostCenterCommand): Promise<CostCenter> {
    return await this.allocationManagementService.updateCostCenter({
      id: command.id,
      workspaceId: command.workspaceId,
      actorId: command.actorId,
      name: command.name,
      code: command.code,
      description: command.description,
    });
  }
}
