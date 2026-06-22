import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';
import { ExpenseService } from '../services/expense.service';
import { ExpenseDTO } from '../../domain/entities/expense.entity';

export interface SubmitExpenseCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class SubmitExpenseHandler implements ICommandHandler<
  SubmitExpenseCommand,
  CommandResult<ExpenseDTO>
> {
  constructor(private readonly expenseService: ExpenseService) {}

  async handle(command: SubmitExpenseCommand): Promise<CommandResult<ExpenseDTO>> {
    const dto = await this.expenseService.submitExpense(
      command.expenseId,
      command.workspaceId,
      command.userId
    );
    return CommandResult.success(dto);
  }
}
