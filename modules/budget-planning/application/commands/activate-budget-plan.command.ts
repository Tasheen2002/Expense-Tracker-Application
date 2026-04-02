import { BudgetPlanService } from '../services/budget-plan.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface ActivateBudgetPlanCommand extends ICommand {
  id: string;
  userId: string;
}

export class ActivateBudgetPlanHandler implements ICommandHandler<
  ActivateBudgetPlanCommand,
  CommandResult<void>
> {
  constructor(private readonly budgetPlanService: BudgetPlanService) {}

  async handle(
    command: ActivateBudgetPlanCommand
  ): Promise<CommandResult<void>> {
    await this.budgetPlanService.activatePlan(command.id, command.userId);
    return CommandResult.success();
  }
}
