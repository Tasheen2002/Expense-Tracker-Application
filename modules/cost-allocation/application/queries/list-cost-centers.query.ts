import { AllocationManagementService } from "../services/allocation-management.service";
import { CostCenter } from "../../domain/entities/cost-center.entity";
import { PaginatedResult } from "../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface";

export class ListCostCentersQuery {
  constructor(
    public readonly workspaceId: string,
    public readonly limit?: number,
    public readonly offset?: number,
  ) {}
}

export class ListCostCentersHandler {
  constructor(
    private readonly allocationManagementService: AllocationManagementService,
  ) {}

  async handle(
    query: ListCostCentersQuery,
  ): Promise<PaginatedResult<CostCenter>> {
    return await this.allocationManagementService.listCostCenters(
      query.workspaceId,
      {
        limit: query.limit || 50,
        offset: query.offset || 0,
      },
    );
  }
}
