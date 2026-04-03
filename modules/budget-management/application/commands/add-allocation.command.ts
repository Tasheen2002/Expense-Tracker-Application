import { BudgetService } from '../services/budget.service';
import { BudgetAllocation } from '../../domain/entities/budget-allocation.entity';

import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface AddAllocationCommand extends ICommand {
  budgetId: string;
  workspaceId: string;
  userId: string;
  categoryId?: string;
  allocatedAmount: number | string;
  description?: string;
}

export class AddAllocationHandler implements ICommandHandler<
  AddAllocationCommand,
  CommandResult<{ allocationId: string }>
> {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(
    command: AddAllocationCommand
  ): Promise<CommandResult<{ allocationId: string }>> {
    const allocation = await this.budgetService.addAllocation({
      budgetId: command.budgetId,
      workspaceId: command.workspaceId,
      userId: command.userId,
      categoryId: command.categoryId,
      allocatedAmount: command.allocatedAmount,
      description: command.description,
    });
    return CommandResult.success({
      allocationId: allocation.getId().getValue(),
    });
  }
}
