import { ExpenseStatus } from "../../domain/enums/expense-status";

import { ExpenseService } from "../services/expense.service";

export class GetExpenseStatisticsQuery {
  constructor(
    public readonly workspaceId: string,
    public readonly userId?: string,
    public readonly currency?: string,
  ) {}
}

export class GetExpenseStatisticsHandler {
  constructor(private readonly expenseService: ExpenseService) {}

  async handle(query: GetExpenseStatisticsQuery) {
    // Single optimized query instead of 6 separate queries
    const stats = await this.expenseService.getExpenseStatistics(
      query.workspaceId,
      query.userId,
      query.currency,
    );

    const totalCount = Object.values(stats.countByStatus).reduce(
      (sum, count) => sum + count,
      0,
    );

    return {
      totalExpense: stats.totalAmount,
      currency: stats.currency,
      expenseCountByStatus: {
        draft: stats.countByStatus[ExpenseStatus.DRAFT],
        submitted: stats.countByStatus[ExpenseStatus.SUBMITTED],
        approved: stats.countByStatus[ExpenseStatus.APPROVED],
        rejected: stats.countByStatus[ExpenseStatus.REJECTED],
        reimbursed: stats.countByStatus[ExpenseStatus.REIMBURSED],
      },
      totalCount,
    };
  }
}
