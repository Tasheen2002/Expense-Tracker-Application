import { ICommand, ICommandHandler, CommandResult } from "../../../../apps/api/src/shared/application";
import { ExpenseService } from "../services/expense.service";
import { Expense } from "../../domain/entities/expense.entity";

export interface SubmitExpenseCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class SubmitExpenseHandler implements ICommandHandler<SubmitExpenseCommand, CommandResult<Expense>> {
  constructor(private readonly expenseService: ExpenseService) {}

  async handle(command: SubmitExpenseCommand): Promise<CommandResult<Expense>> {
    try {
      const expense = await this.expenseService.submitExpense(
        command.expenseId,
        command.workspaceId,
        command.userId,
      );
      return CommandResult.success(expense);
    } catch (error) {
      return CommandResult.failure<Expense>(
        error instanceof Error ? error.message : "Failed to submit expense",
      );
    }
  }
}
