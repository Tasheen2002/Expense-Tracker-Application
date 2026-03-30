import { BudgetPlanService } from '../services/budget-plan.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface DeleteBudgetPlanCommand extends ICommand {
  id: string;
  userId: string;
}

export class DeleteBudgetPlanHandler implements ICommandHandler<
  DeleteBudgetPlanCommand,
  CommandResult<void>
> {
  constructor(private readonly budgetPlanService: BudgetPlanService) {}

  async handle(command: DeleteBudgetPlanCommand): Promise<CommandResult<void>> {
    await this.budgetPlanService.deletePlan(command.id, command.userId);
    return CommandResult.success();
  }
}
