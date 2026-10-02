import { IQuery, IQueryHandler } from '@core/application/cqrs';
import { ExpenseService } from '../services/expense.service';
import { ExpenseDTO } from '../../domain/entities/expense.entity';
import { ExpenseStatus } from '../../domain/enums/expense-status';
import { PaymentMethod } from '../../domain/enums/payment-method';
import { OperationService } from '../services/operation.service';
import { UnauthorizedExpenseAccessError } from '../../domain/errors/expense.errors';

export interface FilterExpensesResult {
  readonly items: readonly ExpenseDTO[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasMore: boolean;
}

import { WorkspaceMembershipContext } from '../ports/workspace-authorization.port';

export interface FilterExpensesQuery extends IQuery {
  readonly workspaceId: string;
  readonly actorId: string;
  readonly role?: string;
  readonly userId?: string;
  readonly categoryId?: string;
  readonly status?: ExpenseStatus;
  readonly paymentMethod?: PaymentMethod;
  readonly isReimbursable?: boolean;
  readonly startDate?: Date;
  readonly endDate?: Date;
  readonly minAmount?: number;
  readonly maxAmount?: number;
  readonly currency?: string;
  readonly searchText?: string;
  readonly limit?: number;
  readonly offset?: number;
  readonly authToken?: string;
  readonly verifiedMembership?: WorkspaceMembershipContext;
}

export class FilterExpensesHandler implements IQueryHandler<FilterExpensesQuery, FilterExpensesResult> {
  constructor(
    private readonly expenseService: ExpenseService,
    private readonly operationService: OperationService
  ) {
    if (!expenseService) {
      throw new Error('ExpenseService is required for FilterExpensesHandler');
    }
    if (!operationService) {
      throw new Error('OperationService is required for FilterExpensesHandler');
    }
  }

  async handle(query: FilterExpensesQuery): Promise<FilterExpensesResult> {
    if (!query.actorId) {
      throw new UnauthorizedExpenseAccessError('unknown', 'anonymous', 'filter expenses');
    }

    // Verify workspace membership at the application boundary
    const membership = await this.operationService.authorize({
      actorId: query.actorId,
      workspaceId: query.workspaceId,
      role: query.role,
      authToken: query.authToken,
      verifiedMembership: query.verifiedMembership,
    });

    const effectiveRole = query.verifiedMembership?.role || membership.role || query.role;

    // Authorize visibility: restrict standard members to their own ID, allow privileged roles to query all or any member
    const effectiveUserId = this.operationService.authorizeFilterVisibility(
      query.actorId,
      query.userId,
      effectiveRole
    );

    return this.expenseService.getExpensesWithFilters(
      {
        workspaceId: query.workspaceId,
        userId: effectiveUserId,
        categoryId: query.categoryId,
        status: query.status,
        paymentMethod: query.paymentMethod,
        isReimbursable: query.isReimbursable,
        startDate: query.startDate,
        endDate: query.endDate,
        minAmount: query.minAmount,
        maxAmount: query.maxAmount,
        currency: query.currency,
        searchText: query.searchText,
      },
      { limit: query.limit, offset: query.offset }
    );
  }
}
