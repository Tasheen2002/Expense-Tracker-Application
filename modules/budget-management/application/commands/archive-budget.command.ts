import { BudgetService } from '../services/budget.service';
import { Budget } from '../../domain/entities/budget.entity';

import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface ArchiveBudgetCommand extends ICommand {
  budgetId: string;
  workspaceId: string;
  userId: string;
}

export class ArchiveBudgetHandler implements ICommandHandler<
  ArchiveBudgetCommand,
  CommandResult<Budget>
> {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(command: ArchiveBudgetCommand): Promise<CommandResult<Budget>> {
    const budget = await this.budgetService.archiveBudget(
      command.budgetId,
      command.workspaceId,
      command.userId
    );
    return CommandResult.success(budget);
  }
}
