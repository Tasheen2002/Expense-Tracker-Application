import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';
import { ExpenseService } from '../services/expense.service';

export interface SubmitExpenseCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class SubmitExpenseHandler implements ICommandHandler<
  SubmitExpenseCommand,
  CommandResult<void>
> {
  constructor(private readonly expenseService: ExpenseService) {}

  async handle(command: SubmitExpenseCommand): Promise<CommandResult<void>> {
    await this.expenseService.submitExpense(
      command.expenseId,
      command.workspaceId,
      command.userId
    );
    return CommandResult.success();
  }
}
