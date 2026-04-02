import { BudgetService } from '../services/budget.service';

import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface DeleteBudgetCommand extends ICommand {
  budgetId: string;
  workspaceId: string;
  userId: string;
}

export class DeleteBudgetHandler implements ICommandHandler<
  DeleteBudgetCommand,
  CommandResult<void>
> {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(command: DeleteBudgetCommand): Promise<CommandResult<void>> {
    try {
      
          await this.budgetService.deleteBudget(
            command.budgetId,
            command.workspaceId,
            command.userId
          );
          return CommandResult.success(undefined);
        
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
