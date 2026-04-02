import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';
import { RecurringExpenseService } from '../services/recurring-expense.service';

export interface PauseRecurringExpenseCommand extends ICommand {
  id: string;
}

export class PauseRecurringExpenseHandler implements ICommandHandler<
  PauseRecurringExpenseCommand,
  CommandResult<void>
> {
  constructor(
    private readonly recurringExpenseService: RecurringExpenseService
  ) {}

  async handle(
    command: PauseRecurringExpenseCommand
  ): Promise<CommandResult<void>> {
    try {
      await this.recurringExpenseService.pauseRecurringExpense(command.id);
      return CommandResult.success();
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
