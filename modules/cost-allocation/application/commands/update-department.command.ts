import { AllocationManagementService } from "../services/allocation-management.service";
import { Department } from "../../domain/entities/department.entity";

export class UpdateDepartmentCommand {
  constructor(
    public readonly id: string,
    public readonly workspaceId: string,
    public readonly actorId: string,
    public readonly name?: string,
    public readonly code?: string,
    public readonly description?: string | null,
    public readonly managerId?: string | null,
    public readonly parentDepartmentId?: string | null,
  ) {}
}

export class UpdateDepartmentHandler {
  constructor(
    private readonly allocationManagementService: AllocationManagementService,
  ) {}

  async handle(command: UpdateDepartmentCommand): Promise<Department> {
    return await this.allocationManagementService.updateDepartment({
      id: command.id,
      workspaceId: command.workspaceId,
      actorId: command.actorId,
      name: command.name,
      code: command.code,
      description: command.description,
      managerId: command.managerId,
      parentDepartmentId: command.parentDepartmentId,
    });
  }
}
