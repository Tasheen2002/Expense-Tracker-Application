import { BudgetService } from '../services/budget.service';
import { BudgetAllocationDTO } from '../../domain/entities/budget-allocation.entity';

import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface UpdateAllocationCommand extends ICommand {
  readonly allocationId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly allocatedAmount?: number | string;
  readonly description?: string | null;
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
