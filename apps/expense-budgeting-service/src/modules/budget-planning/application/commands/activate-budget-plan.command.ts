import { BudgetPlanService } from '../services/budget-plan.service';
import { BudgetPlanDTO } from '../../domain/entities/budget-plan.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface ActivateBudgetPlanCommand extends ICommand {
  readonly id: string;
  readonly workspaceId: string;
  readonly userId: string;
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
