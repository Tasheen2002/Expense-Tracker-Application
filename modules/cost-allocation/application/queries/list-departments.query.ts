import { AllocationManagementService } from "../services/allocation-management.service";
import { Department } from "../../domain/entities/department.entity";
import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export class ListDepartmentsQuery {
  constructor(
    public readonly workspaceId: string,
    public readonly limit?: number,
    public readonly offset?: number,
  ) {}
}

export class ListDepartmentsHandler {
  constructor(
    private readonly allocationManagementService: AllocationManagementService,
  ) {}

  async handle(
    query: ListDepartmentsQuery,
  ): Promise<PaginatedResult<Department>> {
    return await this.allocationManagementService.listDepartments(
      query.workspaceId,
      {
        limit: query.limit || 50,
        offset: query.offset || 0,
      },
    );
  }
}
