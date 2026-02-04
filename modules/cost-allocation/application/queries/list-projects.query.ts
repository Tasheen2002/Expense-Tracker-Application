import { AllocationManagementService } from "../services/allocation-management.service";
import { Project } from "../../domain/entities/project.entity";
import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export class ListProjectsQuery {
  constructor(
    public readonly workspaceId: string,
    public readonly limit?: number,
    public readonly offset?: number,
  ) {}
}

export class ListProjectsHandler {
  constructor(
    private readonly allocationManagementService: AllocationManagementService,
  ) {}

  async handle(query: ListProjectsQuery): Promise<PaginatedResult<Project>> {
    return await this.allocationManagementService.listProjects(
      query.workspaceId,
      {
        limit: query.limit || 50,
        offset: query.offset || 0,
      },
    );
  }
}
