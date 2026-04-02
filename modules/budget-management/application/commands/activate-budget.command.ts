import { BudgetService } from '../services/budget.service';

import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface ActivateBudgetCommand extends ICommand {
  budgetId: string;
  workspaceId: string;
  userId: string;
}

export class ActivateBudgetHandler implements ICommandHandler<
  ActivateBudgetCommand,
  CommandResult<void>
> {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(command: ActivateBudgetCommand): Promise<CommandResult<void>> {
    await this.budgetService.activateBudget(
      command.budgetId,
      command.workspaceId,
      command.userId
    );
    return CommandResult.success();
  }
}
