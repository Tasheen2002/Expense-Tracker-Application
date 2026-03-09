import { BudgetService } from '../services/budget.service';
import { Budget } from '../../domain/entities/budget.entity';

import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

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
  CommandResult<Budget>
> {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(command: UpdateBudgetCommand): Promise<CommandResult<Budget>> {
    const budget = await this.budgetService.updateBudget(
      command.budgetId,
      command.workspaceId,
      command.userId,
      {
        name: command.name,
        description: command.description,
        totalAmount: command.totalAmount,
      }
    );
    return CommandResult.success(budget);
  }
}
