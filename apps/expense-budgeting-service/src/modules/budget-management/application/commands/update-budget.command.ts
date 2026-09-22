import { BudgetService } from '../services/budget.service';
import { BudgetDTO } from '../../domain/entities/budget.entity';

import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface UpdateBudgetCommand extends ICommand {
  readonly budgetId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly name?: string;
  readonly description?: string | null;
  readonly totalAmount?: number | string;
}

export class UpdateBudgetHandler implements ICommandHandler<
  UpdateBudgetCommand,
  CommandResult<BudgetDTO>
> {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(command: UpdateBudgetCommand): Promise<CommandResult<BudgetDTO>> {
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
