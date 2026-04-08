import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';
import { ExpenseService } from '../services/expense.service';
import { ExpenseDTO } from '../../domain/entities/expense.entity';

export interface ApproveExpenseCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly approverId: string;
}

export class ApproveExpenseHandler implements ICommandHandler<
  ApproveExpenseCommand,
  CommandResult<ExpenseDTO>
> {
  constructor(private readonly expenseService: ExpenseService) {}

  async handle(command: ApproveExpenseCommand): Promise<CommandResult<ExpenseDTO>> {
    const dto = await this.expenseService.approveExpense(
      command.expenseId,
      command.workspaceId,
      command.approverId
    );
    return CommandResult.success(dto);
  }
}
