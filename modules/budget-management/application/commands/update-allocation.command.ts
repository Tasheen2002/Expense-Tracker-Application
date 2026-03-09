import { BudgetService } from '../services/budget.service';
import { BudgetAllocation } from '../../domain/entities/budget-allocation.entity';

import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface UpdateAllocationCommand extends ICommand {
  allocationId: string;
  workspaceId: string;
  userId: string;
  allocatedAmount?: number | string;
  description?: string | null;
}

export class UpdateAllocationHandler implements ICommandHandler<
  UpdateAllocationCommand,
  CommandResult<BudgetAllocation>
> {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(
    command: UpdateAllocationCommand
  ): Promise<CommandResult<BudgetAllocation>> {
    const allocation = await this.budgetService.updateAllocation(
      command.allocationId,
      command.workspaceId,
      command.userId,
      {
        allocatedAmount: command.allocatedAmount,
        description: command.description,
      }
    );
    return CommandResult.success(allocation);
  }
}
