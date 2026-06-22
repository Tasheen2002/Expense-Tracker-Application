import { ExpenseAllocationService } from '../services/expense-allocation.service';
import { IQuery, IQueryHandler } from '@core/application/cqrs';

export interface AllocationSummaryData {
  readonly totalAllocations: number;
  readonly byDepartment: Array<{
    readonly departmentId: string;
    readonly departmentName: string;
    readonly total: number;
    readonly count: number;
  }>;
  byCostCenter: Array<{
    costCenterId: string;
    costCenterName: string;
    total: number;
    count: number;
  }>;
  byProject: Array<{
    projectId: string;
    projectName: string;
    total: number;
    count: number;
  }>;
}

export interface GetAllocationSummaryQuery extends IQuery {
  readonly workspaceId: string;
}

export class GetAllocationSummaryHandler implements IQueryHandler<GetAllocationSummaryQuery, AllocationSummaryData> {
  constructor(
    private readonly expenseAllocationService: ExpenseAllocationService
  ) {}

  async handle(query: GetAllocationSummaryQuery): Promise<AllocationSummaryData> {
    return this.expenseAllocationService.getAllocationSummary(query.workspaceId);
  }
}
