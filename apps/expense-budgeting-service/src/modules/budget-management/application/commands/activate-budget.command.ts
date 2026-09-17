import { BudgetService } from '../services/budget.service';
import { BudgetDTO } from '../../domain/entities/budget.entity';

import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface ActivateBudgetCommand extends ICommand {
  readonly budgetId: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class ActivateBudgetHandler implements ICommandHandler<
  ActivateBudgetCommand,
  CommandResult<BudgetDTO>
> {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(command: ActivateBudgetCommand): Promise<CommandResult<BudgetDTO>> {
    const dto = await this.budgetService.activateBudget(
      command.budgetId,
      command.workspaceId,
      command.userId
    );
    return CommandResult.success(dto);
  }
}
