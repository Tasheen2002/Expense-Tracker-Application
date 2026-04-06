import {
  IQuery,
  IQueryHandler,
  QueryResult,
} from '../../../../packages/core/src/application/cqrs';
import { ExpenseService } from '../services/expense.service';
import { Expense } from '../../domain/entities/expense.entity';
import { ExpenseStatus } from '../../domain/enums/expense-status';
import { PaymentMethod } from '../../domain/enums/payment-method';

export interface FilterExpensesResult {
  items: Expense[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface FilterExpensesQuery extends IQuery {
  readonly workspaceId: string;
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
}

export class FilterExpensesHandler implements IQueryHandler<
  FilterExpensesQuery,
  QueryResult<FilterExpensesResult>
> {
  constructor(private readonly expenseService: ExpenseService) {}

  async handle(
    query: FilterExpensesQuery
  ): Promise<QueryResult<FilterExpensesResult>> {
    try {
      const result = await this.expenseService.getExpensesWithFilters({
        workspaceId: query.workspaceId,
        userId: query.userId,
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
        pagination: { limit: query.limit, offset: query.offset },
      });
      return QueryResult.success(result);
    } catch (error: unknown) {
      return QueryResult.fromError(error);
    }
  }
}
