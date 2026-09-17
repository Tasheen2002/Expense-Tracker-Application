import { BudgetService } from '../services/budget.service';
import { BudgetDTO } from '../../domain/entities/budget.entity';

import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface ArchiveBudgetCommand extends ICommand {
  readonly budgetId: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class ArchiveBudgetHandler implements ICommandHandler<
  ArchiveBudgetCommand,
  CommandResult<BudgetDTO>
> {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(command: ArchiveBudgetCommand): Promise<CommandResult<BudgetDTO>> {
    const dto = await this.budgetService.archiveBudget(
      command.budgetId,
      command.workspaceId,
      command.userId
    );
    return CommandResult.success(dto);
  }
}
