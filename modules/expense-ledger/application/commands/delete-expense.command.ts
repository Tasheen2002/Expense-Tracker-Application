import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';
import { ExpenseService } from '../services/expense.service';

export interface DeleteExpenseCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class DeleteExpenseHandler implements ICommandHandler<
  DeleteExpenseCommand,
  CommandResult<void>
> {
  constructor(private readonly expenseService: ExpenseService) {}

  async handle(command: DeleteExpenseCommand): Promise<CommandResult<void>> {
    await this.expenseService.deleteExpense(
      command.expenseId,
      command.workspaceId,
      command.userId
    );
    return CommandResult.success();
  }
}
