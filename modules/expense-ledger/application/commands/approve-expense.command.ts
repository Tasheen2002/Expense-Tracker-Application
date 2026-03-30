import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';
import { ExpenseService } from '../services/expense.service';

export interface ApproveExpenseCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly approverId: string;
}

export class ApproveExpenseHandler implements ICommandHandler<
  ApproveExpenseCommand,
  CommandResult<void>
> {
  constructor(private readonly expenseService: ExpenseService) {}

  async handle(command: ApproveExpenseCommand): Promise<CommandResult<void>> {
    await this.expenseService.approveExpense(
      command.expenseId,
      command.workspaceId,
      command.approverId
    );
    return CommandResult.success();
  }
}
