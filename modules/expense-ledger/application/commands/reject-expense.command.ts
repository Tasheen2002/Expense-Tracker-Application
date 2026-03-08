import { ICommand, ICommandHandler, CommandResult } from "../../../../apps/api/src/shared/application";
import { ExpenseService } from "../services/expense.service";
import { Expense } from "../../domain/entities/expense.entity";

export interface RejectExpenseCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly rejecterId: string;
  readonly reason?: string;
}

export class RejectExpenseHandler implements ICommandHandler<RejectExpenseCommand, CommandResult<Expense>> {
  constructor(private readonly expenseService: ExpenseService) {}

  async handle(command: RejectExpenseCommand): Promise<CommandResult<Expense>> {
    try {
      const expense = await this.expenseService.rejectExpense(
        command.expenseId,
        command.workspaceId,
        command.rejecterId,
        command.reason,
      );
      return CommandResult.success(expense);
    } catch (error) {
      return CommandResult.failure<Expense>(
        error instanceof Error ? error.message : "Failed to reject expense",
      );
    }
  }
}
