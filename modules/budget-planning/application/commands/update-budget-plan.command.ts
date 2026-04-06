import { BudgetPlanService } from '../services/budget-plan.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface UpdateBudgetPlanCommand extends ICommand {
  id: string;
  workspaceId: string;
  userId: string;
  name?: string;
  description?: string;
}

export class UpdateBudgetPlanHandler implements ICommandHandler<
  UpdateBudgetPlanCommand,
  CommandResult<void>
> {
  constructor(private readonly budgetPlanService: BudgetPlanService) {}

  async handle(command: UpdateBudgetPlanCommand): Promise<CommandResult<void>> {
    await this.budgetPlanService.updatePlan({
      id: command.id,
      workspaceId: command.workspaceId,
      userId: command.userId,
      name: command.name,
      description: command.description,
    });
    return CommandResult.success();
  }
}
