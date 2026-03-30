import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';
import { ExpenseService } from '../services/expense.service';

export interface RejectExpenseCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly rejecterId: string;
  readonly reason?: string;
}

export class RejectExpenseHandler implements ICommandHandler<
  RejectExpenseCommand,
  CommandResult<void>
> {
  constructor(private readonly expenseService: ExpenseService) {}

  async handle(command: RejectExpenseCommand): Promise<CommandResult<void>> {
    await this.expenseService.rejectExpense(
      command.expenseId,
      command.workspaceId,
      command.rejecterId,
      command.reason
    );
    return CommandResult.success();
  }
}
