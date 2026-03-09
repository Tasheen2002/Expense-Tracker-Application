import { BudgetService } from '../services/budget.service';
import { Budget } from '../../domain/entities/budget.entity';

import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface ActivateBudgetCommand extends ICommand {
  budgetId: string;
  workspaceId: string;
  userId: string;
}

export class ActivateBudgetHandler implements ICommandHandler<
  ActivateBudgetCommand,
  CommandResult<Budget>
> {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(command: ActivateBudgetCommand): Promise<CommandResult<Budget>> {
    const budget = await this.budgetService.activateBudget(
      command.budgetId,
      command.workspaceId,
      command.userId
    );
    return CommandResult.success(budget);
  }
}
