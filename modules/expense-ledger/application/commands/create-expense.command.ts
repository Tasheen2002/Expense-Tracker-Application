import { ICommand, ICommandHandler, CommandResult } from "../../../../apps/api/src/shared/application";
import { PaymentMethod } from "../../domain/enums/payment-method";
import { ExpenseService } from "../services/expense.service";
import { Expense } from "../../domain/entities/expense.entity";

export interface CreateExpenseCommand extends ICommand {
  readonly workspaceId: string;
  readonly userId: string;
  readonly title: string;
  readonly amount: number;
  readonly currency: string;
  readonly expenseDate: Date | string;
  readonly paymentMethod: PaymentMethod;
  readonly isReimbursable: boolean;
  readonly description?: string;
  readonly categoryId?: string;
  readonly merchant?: string;
  readonly tagIds?: string[];
}

export class CreateExpenseHandler implements ICommandHandler<CreateExpenseCommand, CommandResult<Expense>> {
  constructor(private readonly expenseService: ExpenseService) {}

  async handle(command: CreateExpenseCommand): Promise<CommandResult<Expense>> {
    try {
      const expense = await this.expenseService.createExpense({
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
      return CommandResult.success(expense);
    } catch (error) {
      return CommandResult.failure<Expense>(
        error instanceof Error ? error.message : "Failed to create expense",
      );
    }
  }
}
