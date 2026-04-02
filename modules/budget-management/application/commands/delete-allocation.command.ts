import { BudgetService } from '../services/budget.service';

import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface DeleteAllocationCommand extends ICommand {
  allocationId: string;
  workspaceId: string;
  userId: string;
}

export class DeleteAllocationHandler implements ICommandHandler<
  DeleteAllocationCommand,
  CommandResult<void>
> {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(command: DeleteAllocationCommand): Promise<CommandResult<void>> {
    try {
      
          await this.budgetService.deleteAllocation(
            command.allocationId,
            command.workspaceId,
            command.userId
          );
          return CommandResult.success(undefined);
        
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
