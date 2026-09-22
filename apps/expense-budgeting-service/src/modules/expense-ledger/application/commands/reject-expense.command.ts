import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';
import { ExpenseService } from '../services/expense.service';
import { ExpenseDTO } from '../../domain/entities/expense.entity';

export interface RejectExpenseCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly rejecterId: string;
  readonly reason?: string;
}

export class RejectExpenseHandler implements ICommandHandler<
  RejectExpenseCommand,
  CommandResult<ExpenseDTO>
> {
  constructor(private readonly expenseService: ExpenseService) {}

  async handle(command: RejectExpenseCommand): Promise<CommandResult<ExpenseDTO>> {
    const dto = await this.expenseService.rejectExpense(
      command.expenseId,
      command.workspaceId,
      command.rejecterId,
      command.reason
    );
    return CommandResult.success(dto);
  }
}
