import { AllocationManagementService } from "../services/allocation-management.service";

export class DeleteCostCenterCommand {
  constructor(
    public readonly id: string,
    public readonly workspaceId: string,
    public readonly actorId: string,
  ) {}
}

export class DeleteCostCenterHandler {
  constructor(
    private readonly allocationManagementService: AllocationManagementService,
  ) {}

  async handle(command: DeleteCostCenterCommand): Promise<void> {
    await this.allocationManagementService.deleteCostCenter(
      command.id,
      command.workspaceId,
      command.actorId,
    );
  }
}
