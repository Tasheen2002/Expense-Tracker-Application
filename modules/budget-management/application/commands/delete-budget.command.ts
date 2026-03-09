import { BudgetService } from '../services/budget.service';

import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

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
    await this.budgetService.deleteBudget(
      command.budgetId,
      command.workspaceId,
      command.userId
    );
    return CommandResult.success(undefined);
  }
}
