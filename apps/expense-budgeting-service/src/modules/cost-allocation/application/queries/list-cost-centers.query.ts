import { AllocationManagementService } from '../services/allocation-management.service';
import { CostCenterDTO } from '../../domain/entities/cost-center.entity';
import { PaginatedResult } from '@core/domain/interfaces/paginated-result.interface';
import { IQuery, IQueryHandler } from '@core/application/cqrs';

export interface ListCostCentersQuery extends IQuery {
  readonly workspaceId: string;
  readonly limit?: number;
  readonly offset?: number;
}

export class ListCostCentersHandler implements IQueryHandler<ListCostCentersQuery, PaginatedResult<CostCenterDTO>> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(query: ListCostCentersQuery): Promise<PaginatedResult<CostCenterDTO>> {
    return this.allocationManagementService.listCostCenters(
      query.workspaceId,
      {
        limit: query.limit || 50,
        offset: query.offset || 0,
      }
    );
  }
}
