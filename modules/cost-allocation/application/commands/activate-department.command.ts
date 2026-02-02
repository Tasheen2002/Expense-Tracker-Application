import { AllocationManagementService } from "../services/allocation-management.service";
import { Department } from "../../domain/entities/department.entity";

export class ActivateDepartmentCommand {
  constructor(
    public readonly id: string,
    public readonly workspaceId: string,
    public readonly actorId: string,
  ) {}
}

export class ActivateDepartmentHandler {
  constructor(
    private readonly allocationManagementService: AllocationManagementService,
  ) {}

  async handle(command: ActivateDepartmentCommand): Promise<Department> {
    return await this.allocationManagementService.activateDepartment(
      command.id,
      command.workspaceId,
      command.actorId,
    );
  }
}
