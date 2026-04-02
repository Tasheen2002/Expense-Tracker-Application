import { ExpenseAllocationService } from '../services/expense-allocation.service';
import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';

export interface AllocationSummaryData {
  totalAllocations: number;
  byDepartment: Array<{
    departmentId: string;
    departmentName: string;
    total: number;
    count: number;
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
  workspaceId: string;
}

export class GetAllocationSummaryHandler implements IQueryHandler<
  GetAllocationSummaryQuery,
  QueryResult<AllocationSummaryData>
> {
  constructor(
    private readonly expenseAllocationService: ExpenseAllocationService
  ) {}

  async handle(
    query: GetAllocationSummaryQuery
  ): Promise<QueryResult<AllocationSummaryData>> {
    const summary = await this.expenseAllocationService.getAllocationSummary(
      query.workspaceId
    );
    return QueryResult.success(summary);
  }
}
