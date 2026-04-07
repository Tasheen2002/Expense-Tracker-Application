import { BudgetService } from '../services/budget.service';
import { BudgetAllocationDTO } from '../../domain/entities/budget-allocation.entity';

import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface UpdateAllocationCommand extends ICommand {
  allocationId: string;
  workspaceId: string;
  userId: string;
  allocatedAmount?: number | string;
  description?: string | null;
}

export class UpdateAllocationHandler implements ICommandHandler<
  UpdateAllocationCommand,
  CommandResult<BudgetAllocationDTO>
> {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(command: UpdateAllocationCommand): Promise<CommandResult<BudgetAllocationDTO>> {
    const dto = await this.budgetService.updateAllocation(
      command.allocationId,
      command.workspaceId,
      command.userId,
      {
        allocatedAmount: command.allocatedAmount,
        description: command.description,
      }
    );
    return CommandResult.success(dto);
  }
}
