import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';
import { ExpenseService } from '../services/expense.service';
import { ExpenseDTO } from '../../domain/entities/expense.entity';

export interface ReimburseExpenseCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly processedBy: string;
}

export class ReimburseExpenseHandler implements ICommandHandler<
  ReimburseExpenseCommand,
  CommandResult<ExpenseDTO>
> {
  constructor(private readonly expenseService: ExpenseService) {}

  async handle(command: ReimburseExpenseCommand): Promise<CommandResult<ExpenseDTO>> {
    const dto = await this.expenseService.markExpenseAsReimbursed(
      command.expenseId,
      command.workspaceId,
      command.processedBy
    );
    return CommandResult.success(dto);
  }
}
