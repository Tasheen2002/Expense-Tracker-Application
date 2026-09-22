import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';
import { RecurringExpenseService } from '../services/recurring-expense.service';

export interface StopRecurringExpenseCommand extends ICommand {
  readonly id: string;
}

export class StopRecurringExpenseHandler implements ICommandHandler<
  StopRecurringExpenseCommand,
  CommandResult<void>
> {
  constructor(
    private readonly recurringExpenseService: RecurringExpenseService
  ) {}

  async handle(
    command: StopRecurringExpenseCommand
  ): Promise<CommandResult<void>> {
    await this.recurringExpenseService.stopRecurringExpense(command.id);
    return CommandResult.success();
  }
}
