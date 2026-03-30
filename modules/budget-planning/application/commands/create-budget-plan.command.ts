import { BudgetPlanService } from '../services/budget-plan.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface CreateBudgetPlanCommand extends ICommand {
  workspaceId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  createdBy: string;
  description?: string;
}

export class CreateBudgetPlanHandler implements ICommandHandler<
  CreateBudgetPlanCommand,
  CommandResult<{ budgetPlanId: string }>
> {
  constructor(private readonly budgetPlanService: BudgetPlanService) {}

  async handle(
    command: CreateBudgetPlanCommand
  ): Promise<CommandResult<{ budgetPlanId: string }>> {
    const plan = await this.budgetPlanService.createPlan({
      workspaceId: command.workspaceId,
      name: command.name,
      description: command.description,
      startDate: command.startDate,
      endDate: command.endDate,
      createdBy: command.createdBy,
    });
    return CommandResult.success({ budgetPlanId: plan.getId().getValue() });
  }
}
