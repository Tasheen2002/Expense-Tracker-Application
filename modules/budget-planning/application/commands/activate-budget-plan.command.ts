import { BudgetPlanService } from '../services/budget-plan.service';
import { BudgetPlanDTO } from '../../domain/entities/budget-plan.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface ActivateBudgetPlanCommand extends ICommand {
  id: string;
  workspaceId: string;
  userId: string;
}

export class ActivateBudgetPlanHandler implements ICommandHandler<
  ActivateBudgetPlanCommand,
  CommandResult<BudgetPlanDTO>
> {
  constructor(private readonly budgetPlanService: BudgetPlanService) {}

  async handle(
    command: ActivateBudgetPlanCommand
  ): Promise<CommandResult<BudgetPlanDTO>> {
    const dto = await this.budgetPlanService.activatePlan(command.id, command.workspaceId, command.userId);
    return CommandResult.success(dto);
  }
}
