import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';
import { RecurringExpenseService } from '../services/recurring-expense.service';
import { ExpenseTemplate, RecurringExpenseDTO } from '../../domain/entities/recurring-expense.entity';
import { RecurrenceFrequency } from '../../domain/enums/recurrence-frequency';
import { ICategoryRepository } from '../../domain/repositories/category.repository';
import { CategoryId } from '../../domain/value-objects/category-id';
import { CategoryNotFoundError } from '../../domain/errors/expense.errors';

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
    private readonly recurringExpenseService: RecurringExpenseService,
    private readonly categoryRepository: ICategoryRepository
  ) {}

  async handle(
    command: CreateRecurringExpenseCommand
  ): Promise<CommandResult<RecurringExpenseDTO>> {
    if (command.template.categoryId) {
      const exists = await this.categoryRepository.exists(
        CategoryId.fromString(command.template.categoryId),
        command.workspaceId
      );
      if (!exists) {
        throw new CategoryNotFoundError(
          command.template.categoryId,
          command.workspaceId
        );
      }
    }

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
