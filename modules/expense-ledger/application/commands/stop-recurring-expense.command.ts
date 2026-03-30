import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';
import { RecurringExpenseService } from '../services/recurring-expense.service';

export interface StopRecurringExpenseCommand extends ICommand {
  id: string;
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
    try {
      await this.recurringExpenseService.stopRecurringExpense(command.id);
      return CommandResult.success();
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
