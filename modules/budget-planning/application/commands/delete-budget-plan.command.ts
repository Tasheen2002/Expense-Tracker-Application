import { BudgetPlanService } from '../services/budget-plan.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface DeleteBudgetPlanCommand extends ICommand {
  readonly id: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class DeleteBudgetPlanHandler implements ICommandHandler<
  DeleteBudgetPlanCommand,
  CommandResult<void>
> {
  constructor(private readonly budgetPlanService: BudgetPlanService) {}

  async handle(command: DeleteBudgetPlanCommand): Promise<CommandResult<void>> {
    await this.budgetPlanService.deletePlan(command.id, command.workspaceId, command.userId);
    return CommandResult.success();
  }
}
