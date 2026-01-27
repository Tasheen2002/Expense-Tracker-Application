import { AllocationManagementService } from '../services/allocation-management.service'

export class DeleteProjectCommand {
  constructor(
    public readonly id: string,
    public readonly workspaceId: string
  ) {}
}

export class DeleteProjectHandler {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(command: DeleteProjectCommand): Promise<void> {
    await this.allocationManagementService.deleteProject(
      command.id,
      command.workspaceId
    )
  }
}
