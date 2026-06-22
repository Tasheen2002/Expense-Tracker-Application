import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';
import { RecurringExpenseService } from '../services/recurring-expense.service';

export interface ProcessRecurringExpensesCommand extends ICommand {
  readonly limit?: number;
}

export class ProcessRecurringExpensesHandler implements ICommandHandler<
  ProcessRecurringExpensesCommand,
  CommandResult<{ count: number }>
> {
  constructor(
    private readonly recurringExpenseService: RecurringExpenseService
  ) {}

  async handle(
    command: ProcessRecurringExpensesCommand
  ): Promise<CommandResult<{ count: number }>> {
    const count = await this.recurringExpenseService.processDueExpenses(
      command.limit ?? 100
    );
    return CommandResult.success({ count });
  }
}
