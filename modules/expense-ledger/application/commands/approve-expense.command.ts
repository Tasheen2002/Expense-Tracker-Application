import { ICommand, ICommandHandler, CommandResult } from "../../../../apps/api/src/shared/application";
import { ExpenseService } from "../services/expense.service";
import { Expense } from "../../domain/entities/expense.entity";

export interface ApproveExpenseCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly approverId: string;
}

export class ApproveExpenseHandler implements ICommandHandler<ApproveExpenseCommand, CommandResult<Expense>> {
  constructor(private readonly expenseService: ExpenseService) {}

  async handle(command: ApproveExpenseCommand): Promise<CommandResult<Expense>> {
    try {
      const expense = await this.expenseService.approveExpense(
        command.expenseId,
        command.workspaceId,
        command.approverId,
      );
      return CommandResult.success(expense);
    } catch (error) {
      return CommandResult.failure<Expense>(
        error instanceof Error ? error.message : "Failed to approve expense",
      );
    }
  }
}
