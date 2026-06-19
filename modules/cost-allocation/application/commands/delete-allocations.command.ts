import { ExpenseAllocationService } from '../services/expense-allocation.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface DeleteAllocationsCommand extends ICommand {
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly userId: string;
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
