import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';
import { RecurringExpenseService } from '../services/recurring-expense.service';
import { ExpenseTemplate, RecurringExpenseDTO } from '../../domain/entities/recurring-expense.entity';
import { RecurrenceFrequency } from '../../domain/enums/recurrence-frequency';

export interface CreateRecurringExpenseCommand extends ICommand {
  readonly workspaceId: string;
  readonly userId: string;
  readonly frequency: RecurrenceFrequency;
  readonly interval: number;
  readonly startDate: Date;
  readonly endDate?: Date;
  readonly template: ExpenseTemplate;
}

export class CreateRecurringExpenseHandler implements ICommandHandler<
  CreateRecurringExpenseCommand,
  CommandResult<RecurringExpenseDTO>
> {
  constructor(
    private readonly recurringExpenseService: RecurringExpenseService
  ) {}

  async handle(
    command: CreateRecurringExpenseCommand
  ): Promise<CommandResult<RecurringExpenseDTO>> {
    const dto = await this.recurringExpenseService.createRecurringExpense({
      workspaceId: command.workspaceId,
      userId: command.userId,
      frequency: command.frequency,
      interval: command.interval,
      startDate: command.startDate,
      endDate: command.endDate,
      template: command.template,
    });
    return CommandResult.success(dto);
  }
}
