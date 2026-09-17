import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';
import { RecurringExpenseService } from '../services/recurring-expense.service';

export interface ResumeRecurringExpenseCommand extends ICommand {
  readonly id: string;
}

export class ResumeRecurringExpenseHandler implements ICommandHandler<
  ResumeRecurringExpenseCommand,
  CommandResult<void>
> {
  constructor(
    private readonly recurringExpenseService: RecurringExpenseService
  ) {}

  async handle(
    command: ResumeRecurringExpenseCommand
  ): Promise<CommandResult<void>> {
    await this.recurringExpenseService.resumeRecurringExpense(command.id);
    return CommandResult.success();
  }
}
