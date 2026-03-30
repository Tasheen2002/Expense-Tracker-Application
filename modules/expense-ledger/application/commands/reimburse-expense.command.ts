import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';
import { ExpenseService } from '../services/expense.service';

export interface ReimburseExpenseCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly processedBy: string;
}

export class ReimburseExpenseHandler implements ICommandHandler<
  ReimburseExpenseCommand,
  CommandResult<void>
> {
  constructor(private readonly expenseService: ExpenseService) {}

  async handle(command: ReimburseExpenseCommand): Promise<CommandResult<void>> {
    await this.expenseService.markExpenseAsReimbursed(
      command.expenseId,
      command.workspaceId,
      command.processedBy
    );
    return CommandResult.success();
  }
}
