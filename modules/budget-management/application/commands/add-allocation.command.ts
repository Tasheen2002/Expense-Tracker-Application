import { BudgetService } from '../services/budget.service';
import { BudgetAllocationDTO } from '../../domain/entities/budget-allocation.entity';

import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface AddAllocationCommand extends ICommand {
  readonly budgetId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly categoryId?: string;
  readonly allocatedAmount: number | string;
  readonly description?: string;
}

export class AddAllocationHandler implements ICommandHandler<
  AddAllocationCommand,
  CommandResult<BudgetAllocationDTO>
> {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(
    command: AddAllocationCommand
  ): Promise<CommandResult<BudgetAllocationDTO>> {
    const dto = await this.budgetService.addAllocation({
      budgetId: command.budgetId,
      workspaceId: command.workspaceId,
      userId: command.userId,
      categoryId: command.categoryId,
      allocatedAmount: command.allocatedAmount,
      description: command.description,
    });
    return CommandResult.success(dto);
  }
}
