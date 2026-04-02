import { BudgetService } from '../services/budget.service';

import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface UpdateBudgetCommand extends ICommand {
  budgetId: string;
  workspaceId: string;
  userId: string;
  name?: string;
  description?: string | null;
  totalAmount?: number | string;
}

export class UpdateBudgetHandler implements ICommandHandler<
  UpdateBudgetCommand,
  CommandResult<void>
> {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(command: UpdateBudgetCommand): Promise<CommandResult<void>> {
    await this.budgetService.updateBudget(
      command.budgetId,
      command.workspaceId,
      command.userId,
      {
        name: command.name,
        description: command.description,
        totalAmount: command.totalAmount,
      }
    );
    return CommandResult.success();
  }
}
