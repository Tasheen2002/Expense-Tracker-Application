import { IQuery, IQueryHandler, QueryResult } from "../../../../apps/api/src/shared/application";
import { ExpenseService } from "../services/expense.service";
import { ExpenseStatus } from "../../domain/enums/expense-status";

export interface GetExpenseStatisticsQuery extends IQuery {
  readonly workspaceId: string;
  readonly userId?: string;
  readonly currency?: string;
}

export class GetExpenseStatisticsHandler implements IQueryHandler<GetExpenseStatisticsQuery, QueryResult<any>> {
  constructor(private readonly expenseService: ExpenseService) {}

  async handle(query: GetExpenseStatisticsQuery): Promise<QueryResult<any>> {
    try {
      const stats = await this.expenseService.getExpenseStatistics(
        query.workspaceId,
        query.userId,
        query.currency,
      );

      const totalCount = Object.values(stats.countByStatus).reduce(
        (sum, count) => sum + count,
        0,
      );

      return QueryResult.success({
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
      });
    } catch (error) {
      return QueryResult.failure(
        error instanceof Error ? error.message : "Failed to get expense statistics",
      );
    }
  }
}
