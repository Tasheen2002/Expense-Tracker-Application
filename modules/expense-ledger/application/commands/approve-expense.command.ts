import { ExpenseService } from "../services/expense.service";

export interface ApproveExpenseCommand {
  expenseId: string;
  workspaceId: string;
  approverId: string;
}

export class ApproveExpenseHandler {
  constructor(private readonly expenseService: ExpenseService) {}

  async handle(command: ApproveExpenseCommand) {
    return await this.expenseService.approveExpense(
      command.expenseId,
      command.workspaceId,
      command.approverId,
    );
  }
}
