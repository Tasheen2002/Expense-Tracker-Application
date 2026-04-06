import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';
import { RecurringExpenseService } from '../services/recurring-expense.service';
import {
  ExpenseTemplate,
  RecurringExpense,
} from '../../domain/entities/recurring-expense.entity';
import { RecurrenceFrequency } from '../../domain/enums/recurrence-frequency';

export interface CreateRecurringExpenseCommand extends ICommand {
  workspaceId: string;
  userId: string;
  frequency: RecurrenceFrequency;
  interval: number;
  startDate: Date;
  endDate?: Date;
  template: ExpenseTemplate;
}

export class CreateRecurringExpenseHandler implements ICommandHandler<
  CreateRecurringExpenseCommand,
  CommandResult<RecurringExpense>
> {
  constructor(
    private readonly recurringExpenseService: RecurringExpenseService
  ) {}

  async handle(
    command: CreateRecurringExpenseCommand
  ): Promise<CommandResult<RecurringExpense>> {
    try {
      const expense = await this.recurringExpenseService.createRecurringExpense(
        {
          workspaceId: command.workspaceId,
          userId: command.userId,
          frequency: command.frequency,
          interval: command.interval,
          startDate: command.startDate,
          endDate: command.endDate,
          template: command.template,
        }
      );
      return CommandResult.success(expense);
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
