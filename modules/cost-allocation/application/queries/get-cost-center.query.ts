import { AllocationManagementService } from '../services/allocation-management.service';
import { CostCenterDTO } from '../../domain/entities/cost-center.entity';
import { IQuery, IQueryHandler } from '../../../../packages/core/src/application/cqrs';

export interface GetCostCenterQuery extends IQuery {
  id: string;
}

export class GetCostCenterHandler implements IQueryHandler<GetCostCenterQuery, CostCenterDTO> {
  constructor(
    private readonly allocationManagementService: AllocationManagementService
  ) {}

  async handle(query: GetCostCenterQuery): Promise<CostCenterDTO> {
    return this.allocationManagementService.getCostCenter(query.id);
  }
}
