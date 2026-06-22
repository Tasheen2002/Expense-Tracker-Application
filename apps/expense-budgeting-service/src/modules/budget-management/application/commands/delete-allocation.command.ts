import { BudgetService } from '../services/budget.service';

import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface DeleteAllocationCommand extends ICommand {
  readonly allocationId: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class DeleteAllocationHandler implements ICommandHandler<
  DeleteAllocationCommand,
  CommandResult<void>
> {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(command: DeleteAllocationCommand): Promise<CommandResult<void>> {
    await this.budgetService.deleteAllocation(
      command.allocationId,
      command.workspaceId,
      command.userId
    );
    return CommandResult.success(undefined);
  }
}
