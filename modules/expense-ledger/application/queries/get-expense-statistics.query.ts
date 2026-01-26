import { ExpenseStatus } from '../../domain/enums/expense-status'

export class GetExpenseStatisticsQuery {
  constructor(
    public readonly workspaceId: string,
    public readonly userId?: string,
    public readonly currency?: string
  ) {}
}

export class GetExpenseStatisticsHandler {
  constructor(private readonly expenseService: any) {}

  async handle(query: GetExpenseStatisticsQuery) {
    const [
      totalExpense,
      draftCount,
      submittedCount,
      approvedCount,
      rejectedCount,
      reimbursedCount,
    ] = await Promise.all([
      query.userId
        ? this.expenseService.getTotalExpenseByUser(query.userId, query.workspaceId, query.currency)
        : this.expenseService.getTotalExpenseByWorkspace(query.workspaceId, query.currency),
      this.expenseService.getExpenseCountByStatus(ExpenseStatus.DRAFT, query.workspaceId),
      this.expenseService.getExpenseCountByStatus(ExpenseStatus.SUBMITTED, query.workspaceId),
      this.expenseService.getExpenseCountByStatus(ExpenseStatus.APPROVED, query.workspaceId),
      this.expenseService.getExpenseCountByStatus(ExpenseStatus.REJECTED, query.workspaceId),
      this.expenseService.getExpenseCountByStatus(ExpenseStatus.REIMBURSED, query.workspaceId),
    ])

    return {
      totalExpense: totalExpense.total,
      currency: query.currency || totalExpense.currency,
      expenseCountByStatus: {
        draft: draftCount,
        submitted: submittedCount,
        approved: approvedCount,
        rejected: rejectedCount,
        reimbursed: reimbursedCount,
      },
      totalCount: draftCount + submittedCount + approvedCount + rejectedCount + reimbursedCount,
    }
  }
}
