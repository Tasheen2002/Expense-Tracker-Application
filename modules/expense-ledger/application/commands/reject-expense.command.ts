import { ExpenseService } from "../services/expense.service";

export interface RejectExpenseCommand {
  expenseId: string;
  workspaceId: string;
  rejecterId: string;
  reason?: string;
}

export class RejectExpenseHandler {
  constructor(private readonly expenseService: ExpenseService) {}

  async handle(command: RejectExpenseCommand) {
    return await this.expenseService.rejectExpense(
      command.expenseId,
      command.workspaceId,
      command.rejecterId,
      command.reason,
    );
  }
}
