import { AllocationManagementService } from '../services/allocation-management.service';
import { CostCenter } from '../../domain/entities/cost-center.entity';
import { PaginatedResult } from '../../../../apps/api/src/shared/domain/interfaces/paginated-result.interface';
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
  QueryResult<PaginatedResult<CostCenter>>
> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(
    query: ListCostCentersQuery
  ): Promise<QueryResult<PaginatedResult<CostCenter>>> {
    const result = await this.allocationManagementService.listCostCenters(
      query.workspaceId,
      {
        limit: query.limit || 50,
        offset: query.offset || 0,
      }
    );
    return QueryResult.success(result);
  }
}
