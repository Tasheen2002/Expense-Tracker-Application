import { ExpenseAllocationService } from '../services/expense-allocation.service'

export class GetAllocationSummaryQuery {
  constructor(
    public readonly workspaceId: string
  ) {}
}

export class GetAllocationSummaryHandler {
  constructor(
    private readonly expenseAllocationService: ExpenseAllocationService
  ) {}

  async handle(query: GetAllocationSummaryQuery): Promise<{
    totalAllocations: number
    byDepartment: Array<{ departmentId: string; departmentName: string; total: number; count: number }>
    byCostCenter: Array<{ costCenterId: string; costCenterName: string; total: number; count: number }>
    byProject: Array<{ projectId: string; projectName: string; total: number; count: number }>
  }> {
    return await this.expenseAllocationService.getAllocationSummary(query.workspaceId)
  }
}
