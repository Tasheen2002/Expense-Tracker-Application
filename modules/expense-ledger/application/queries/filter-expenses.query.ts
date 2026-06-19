import { IQuery, IQueryHandler } from '@core/application/cqrs';
import { ExpenseService } from '../services/expense.service';
import { ExpenseDTO } from '../../domain/entities/expense.entity';
import { ExpenseStatus } from '../../domain/enums/expense-status';
import { PaymentMethod } from '../../domain/enums/payment-method';

export interface FilterExpensesResult {
  readonly items: readonly ExpenseDTO[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasMore: boolean;
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

export class FilterExpensesHandler implements IQueryHandler<FilterExpensesQuery, FilterExpensesResult> {
  constructor(private readonly expenseService: ExpenseService) {}

  async handle(query: FilterExpensesQuery): Promise<FilterExpensesResult> {
    return this.expenseService.getExpensesWithFilters(
      {
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
      },
      { limit: query.limit, offset: query.offset }
    );
  }
}

