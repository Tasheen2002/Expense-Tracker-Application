import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';
import { RecurringExpenseService } from '../services/recurring-expense.service';

export interface ProcessRecurringExpensesCommand extends ICommand {
  limit?: number;
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
    try {
      const count = await this.recurringExpenseService.processDueExpenses(
        command.limit ?? 100
      );
      return CommandResult.success({ count });
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
