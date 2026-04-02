import { ExpenseAllocationService } from '../services/expense-allocation.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface DeleteAllocationsCommand extends ICommand {
  expenseId: string;
  workspaceId: string;
  userId: string;
}

export class DeleteAllocationsHandler implements ICommandHandler<
  DeleteAllocationsCommand,
  CommandResult<void>
> {
  constructor(
    private readonly expenseAllocationService: ExpenseAllocationService
  ) {}

  async handle(
    command: DeleteAllocationsCommand
  ): Promise<CommandResult<void>> {
    await this.expenseAllocationService.deleteAllocations(
      command.expenseId,
      command.workspaceId,
      command.userId
    );
    return CommandResult.success(undefined);
  }
}
