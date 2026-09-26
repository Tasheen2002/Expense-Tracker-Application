import { IQuery, IQueryHandler } from '@core/application/cqrs';
import { ExpenseService } from '../services/expense.service';
import { ExpenseStatus } from '../../domain/enums/expense-status';
import { OperationService } from '../services/operation.service';
import {
  UnauthorizedExpenseAccessError,
  CurrencyRequiredError,
} from '../../domain/errors/expense.errors';

import { WorkspaceMembershipContext } from '../ports/workspace-authorization.port';

export interface GetExpenseStatisticsQuery extends IQuery {
  readonly workspaceId: string;
  readonly actorId: string;
  readonly role?: string;
  readonly userId?: string;
  readonly currency?: string;
  readonly authToken?: string;
  readonly verifiedMembership?: WorkspaceMembershipContext;
}

export interface ExpenseStatisticsResult {
  totalExpense: number;
  currency: string;
  expenseCountByStatus: {
    draft: number;
    submitted: number;
    approved: number;
    rejected: number;
    reimbursed: number;
  };
  totalCount: number;
}

export class GetExpenseStatisticsHandler implements IQueryHandler<GetExpenseStatisticsQuery, ExpenseStatisticsResult> {
  constructor(
    private readonly expenseService: ExpenseService,
    private readonly operationService: OperationService
  ) {
    if (!expenseService) {
      throw new Error('ExpenseService is required for GetExpenseStatisticsHandler');
    }
    if (!operationService) {
      throw new Error('OperationService is required for GetExpenseStatisticsHandler');
    }
  }

  async handle(query: GetExpenseStatisticsQuery): Promise<ExpenseStatisticsResult> {
    if (!query.actorId) {
      throw new UnauthorizedExpenseAccessError('unknown', 'anonymous', 'get expense statistics');
    }

    if (!query.currency) {
      throw new CurrencyRequiredError();
    }

    const membership = await this.operationService.authorize({
      actorId: query.actorId,
      workspaceId: query.workspaceId,
      role: query.role,
      authToken: query.authToken,
      verifiedMembership: query.verifiedMembership,
    });

    const effectiveRole = query.verifiedMembership?.role || membership.role || query.role;
    const effectiveUserId = this.operationService.authorizeFilterVisibility(
      query.actorId,
      query.userId,
      effectiveRole
    );

    const stats = await this.expenseService.getExpenseStatistics(
      query.workspaceId,
      effectiveUserId,
      query.currency
    );

    const totalCount = Object.values(stats.countByStatus).reduce(
      (sum, count) => sum + count,
      0
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
