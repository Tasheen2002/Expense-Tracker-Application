import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';
import { RecurringExpenseService } from '../services/recurring-expense.service';

export interface ResumeRecurringExpenseCommand extends ICommand {
  id: string;
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
    try {
      await this.recurringExpenseService.resumeRecurringExpense(command.id);
      return CommandResult.success();
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
