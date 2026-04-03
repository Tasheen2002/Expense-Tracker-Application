import { BudgetService } from '../services/budget.service';

import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface ArchiveBudgetCommand extends ICommand {
  budgetId: string;
  workspaceId: string;
  userId: string;
}

export class ArchiveBudgetHandler implements ICommandHandler<
  ArchiveBudgetCommand,
  CommandResult<void>
> {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(command: ArchiveBudgetCommand): Promise<CommandResult<void>> {
    await this.budgetService.archiveBudget(
      command.budgetId,
      command.workspaceId,
      command.userId
    );
    return CommandResult.success();
  }
}
