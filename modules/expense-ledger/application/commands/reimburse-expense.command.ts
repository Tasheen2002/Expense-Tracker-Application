import { ICommand, ICommandHandler, CommandResult } from "../../../../apps/api/src/shared/application";
import { ExpenseService } from "../services/expense.service";
import { Expense } from "../../domain/entities/expense.entity";

export interface ReimburseExpenseCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly processedBy: string;
}

export class ReimburseExpenseHandler implements ICommandHandler<ReimburseExpenseCommand, CommandResult<Expense>> {
  constructor(private readonly expenseService: ExpenseService) {}

  async handle(command: ReimburseExpenseCommand): Promise<CommandResult<Expense>> {
    try {
      const expense = await this.expenseService.markExpenseAsReimbursed(
        command.expenseId,
        command.workspaceId,
        command.processedBy,
      );
      return CommandResult.success(expense);
    } catch (error) {
      return CommandResult.failure<Expense>(
        error instanceof Error ? error.message : "Failed to reimburse expense",
      );
    }
  }
}
