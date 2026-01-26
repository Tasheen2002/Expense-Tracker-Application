import { PaymentMethod } from '../../domain/enums/payment-method'

export class UpdateExpenseCommand {
  constructor(
    public readonly expenseId: string,
    public readonly workspaceId: string,
    public readonly userId: string,
    public readonly title?: string,
    public readonly description?: string,
    public readonly amount?: number,
    public readonly currency?: string,
    public readonly expenseDate?: Date | string,
    public readonly categoryId?: string,
    public readonly merchant?: string,
    public readonly paymentMethod?: PaymentMethod,
    public readonly isReimbursable?: boolean
  ) {}
}

export class UpdateExpenseHandler {
  constructor(private readonly expenseService: any) {}

  async handle(command: UpdateExpenseCommand) {
    return await this.expenseService.updateExpense(
      command.expenseId,
      command.workspaceId,
      command.userId,
      {
        title: command.title,
        description: command.description,
        amount: command.amount,
        currency: command.currency,
        expenseDate: command.expenseDate,
        categoryId: command.categoryId,
        merchant: command.merchant,
        paymentMethod: command.paymentMethod,
        isReimbursable: command.isReimbursable,
      }
    )
  }
}
