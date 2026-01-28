import { ExpenseService } from "../services/expense.service";

export interface ReimburseExpenseCommand {
  expenseId: string;
  workspaceId: string;
  processedBy: string;
}

export class ReimburseExpenseHandler {
  constructor(private readonly expenseService: ExpenseService) {}

  async handle(command: ReimburseExpenseCommand) {
    return await this.expenseService.markExpenseAsReimbursed(
      command.expenseId,
      command.workspaceId,
      command.processedBy,
    );
  }
}
