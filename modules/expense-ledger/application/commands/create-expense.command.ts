import { PaymentMethod } from "../../domain/enums/payment-method";
import { ExpenseService } from "../services/expense.service";

export class CreateExpenseCommand {
  constructor(
    public readonly workspaceId: string,
    public readonly userId: string,
    public readonly title: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly expenseDate: Date | string,
    public readonly paymentMethod: PaymentMethod,
    public readonly isReimbursable: boolean,
    public readonly description?: string,
    public readonly categoryId?: string,
    public readonly merchant?: string,
    public readonly tagIds?: string[],
  ) {}
}

export class CreateExpenseHandler {
  constructor(private readonly expenseService: ExpenseService) {}

  async handle(command: CreateExpenseCommand) {
    return await this.expenseService.createExpense({
      workspaceId: command.workspaceId,
      userId: command.userId,
      title: command.title,
      description: command.description,
      amount: command.amount,
      currency: command.currency,
      expenseDate: command.expenseDate,
      categoryId: command.categoryId,
      merchant: command.merchant,
      paymentMethod: command.paymentMethod,
      isReimbursable: command.isReimbursable,
      tagIds: command.tagIds,
    });
  }
}
