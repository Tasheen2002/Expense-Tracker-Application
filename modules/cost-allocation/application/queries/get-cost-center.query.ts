import { AllocationManagementService } from '../services/allocation-management.service';
import { CostCenter } from '../../domain/entities/cost-center.entity';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface GetCostCenterQuery extends IQuery {
  id: string;
}

export class GetCostCenterHandler implements IQueryHandler<
  GetCostCenterQuery,
  QueryResult<CostCenter>
> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(query: GetCostCenterQuery): Promise<QueryResult<CostCenter>> {
    const costCenter = await this.allocationManagementService.getCostCenter(
      query.id
    );
    return QueryResult.success(costCenter);
  }
}
