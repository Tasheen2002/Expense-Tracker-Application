import { AllocationManagementService } from '../services/allocation-management.service';
import { CostCenter, CostCenterDTO } from '../../domain/entities/cost-center.entity';
import { PaginatedResult } from '../../../../packages/core/src/domain/interfaces/paginated-result.interface';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface ListCostCentersQuery extends IQuery {
  workspaceId: string;
  limit?: number;
  offset?: number;
}

export class ListCostCentersHandler implements IQueryHandler<
  ListCostCentersQuery,
  QueryResult<PaginatedResult<CostCenterDTO>>
> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(
    query: ListCostCentersQuery
  ): Promise<QueryResult<PaginatedResult<CostCenterDTO>>> {
    const result = await this.allocationManagementService.listCostCenters(
      query.workspaceId,
      {
        limit: query.limit || 50,
        offset: query.offset || 0,
      }
    );
    return QueryResult.success({
      items: result.items.map(CostCenter.toDTO),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    });
  }
}
