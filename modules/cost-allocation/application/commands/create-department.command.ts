import { AllocationManagementService } from "../services/allocation-management.service";
import { Department } from "../../domain/entities/department.entity";

export class CreateDepartmentCommand {
  constructor(
    public readonly workspaceId: string,
    public readonly actorId: string,
    public readonly name: string,
    public readonly code: string,
    public readonly description?: string,
    public readonly managerId?: string,
    public readonly parentDepartmentId?: string,
  ) {}
}

export class CreateDepartmentHandler {
  constructor(
    private readonly allocationManagementService: AllocationManagementService,
  ) {}

  async handle(command: CreateDepartmentCommand): Promise<Department> {
    return await this.allocationManagementService.createDepartment({
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
