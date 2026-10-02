import { ExpenseAllocationService } from '../services/expense-allocation.service';
import { IQuery, IQueryHandler } from '@core/application/cqrs';

export interface AllocationSummaryData {
  readonly totalAllocations: number;
  readonly byDepartment: Array<{
    readonly departmentId: string;
    readonly departmentName: string;
    readonly currency: string;
    readonly total: string;
    readonly count: number;
  }>;
  byCostCenter: Array<{
    costCenterId: string;
    costCenterName: string;
    currency: string;
    total: string;
    count: number;
  }>;
  byProject: Array<{
    projectId: string;
    projectName: string;
    currency: string;
    total: string;
    count: number;
  }>;
}

export interface GetAllocationSummaryQuery extends IQuery {
  readonly workspaceId: string;
  readonly actorId: string;
}

export class GetAllocationSummaryHandler implements IQueryHandler<GetAllocationSummaryQuery, AllocationSummaryData> {
  constructor(
    private readonly expenseAllocationService: ExpenseAllocationService
  ) {}

  async handle(query: GetAllocationSummaryQuery): Promise<AllocationSummaryData> {
    return this.expenseAllocationService.getAllocationSummary(query.workspaceId, query.actorId);
  }
}
