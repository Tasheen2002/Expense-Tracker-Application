import { AllocationManagementService } from '../services/allocation-management.service'

export class DeleteDepartmentCommand {
  constructor(
    public readonly id: string,
    public readonly workspaceId: string
  ) {}
}

export class DeleteDepartmentHandler {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(command: DeleteDepartmentCommand): Promise<void> {
    await this.allocationManagementService.deleteDepartment(
      command.id,
      command.workspaceId
    )
  }
}
