import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';
import { RecurringExpenseService } from '../services/recurring-expense.service';

export interface PauseRecurringExpenseCommand extends ICommand {
  readonly id: string;
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
    await this.recurringExpenseService.pauseRecurringExpense(command.id);
    return CommandResult.success();
  }
}
