import { BudgetService } from '../services/budget.service';

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
  CommandResult<void>
> {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(command: ArchiveBudgetCommand): Promise<CommandResult<void>> {
    try {
      
          await this.budgetService.archiveBudget(
            command.budgetId,
            command.workspaceId,
            command.userId
          );
          return CommandResult.success();
        
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
