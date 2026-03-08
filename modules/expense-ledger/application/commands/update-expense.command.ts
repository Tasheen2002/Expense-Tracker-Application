import { ICommand, ICommandHandler, CommandResult } from "../../../../apps/api/src/shared/application";
import { PaymentMethod } from "../../domain/enums/payment-method";
import { ExpenseService } from "../services/expense.service";
import { Expense } from "../../domain/entities/expense.entity";

export interface UpdateExpenseCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly title?: string;
  readonly description?: string;
  readonly amount?: number;
  readonly currency?: string;
  readonly expenseDate?: Date | string;
  readonly categoryId?: string;
  readonly merchant?: string;
  readonly paymentMethod?: PaymentMethod;
  readonly isReimbursable?: boolean;
}

export class UpdateExpenseHandler implements ICommandHandler<UpdateExpenseCommand, CommandResult<Expense>> {
  constructor(private readonly expenseService: ExpenseService) {}

  async handle(command: UpdateExpenseCommand): Promise<CommandResult<Expense>> {
    try {
      const expense = await this.expenseService.updateExpense(
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
        },
      );
      return CommandResult.success(expense);
    } catch (error) {
      return CommandResult.failure<Expense>(
        error instanceof Error ? error.message : "Failed to update expense",
      );
    }
  }
}
