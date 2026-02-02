import { AllocationManagementService } from "../services/allocation-management.service";
import { Project } from "../../domain/entities/project.entity";

export class CreateProjectCommand {
  constructor(
    public readonly workspaceId: string,
    public readonly actorId: string,
    public readonly name: string,
    public readonly code: string,
    public readonly startDate: string | Date,
    public readonly description?: string,
    public readonly endDate?: string | Date,
    public readonly managerId?: string,
    public readonly budget?: number,
  ) {}
}

export class CreateProjectHandler {
  constructor(
    private readonly allocationManagementService: AllocationManagementService,
  ) {}

  async handle(command: CreateProjectCommand): Promise<Project> {
    return await this.allocationManagementService.createProject({
      workspaceId: command.workspaceId,
      actorId: command.actorId,
      name: command.name,
      code: command.code,
      startDate: command.startDate,
      description: command.description,
      endDate: command.endDate,
      managerId: command.managerId,
      budget: command.budget,
    });
  }
}
