import { ExpenseStatus } from '../../domain/enums/expense-status'
import { PaymentMethod } from '../../domain/enums/payment-method'

export class FilterExpensesQuery {
  constructor(
    public readonly workspaceId: string,
    public readonly userId?: string,
    public readonly categoryId?: string,
    public readonly status?: ExpenseStatus,
    public readonly paymentMethod?: PaymentMethod,
    public readonly isReimbursable?: boolean,
    public readonly startDate?: Date,
    public readonly endDate?: Date,
    public readonly minAmount?: number,
    public readonly maxAmount?: number,
    public readonly currency?: string,
    public readonly searchText?: string
  ) {}
}

export class FilterExpensesHandler {
  constructor(private readonly expenseService: any) {}

  async handle(query: FilterExpensesQuery) {
    return await this.expenseService.getExpensesWithFilters({
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
    })
  }
}
