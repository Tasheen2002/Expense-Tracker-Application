import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';
import { RecurringExpenseService } from '../services/recurring-expense.service';

export interface ResumeRecurringExpenseCommand extends ICommand {
  readonly id: string;
  readonly workspaceId: string;
  readonly userId: string;
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
    await this.recurringExpenseService.resumeRecurringExpense(
      command.id,
      command.workspaceId,
      command.userId
    );
    return CommandResult.success();
  }
}
