import { BudgetPlanService } from '../services/budget-plan.service';
import { BudgetPlanDTO } from '../../domain/entities/budget-plan.entity';
import { PeriodType } from '../../domain/enums/period-type.enum';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../packages/core/src/application/cqrs';

export interface CreateBudgetPlanCommand extends ICommand {
  workspaceId: string;
  name: string;
  periodType: PeriodType;
  startDate: Date;
  endDate: Date;
  createdBy: string;
  description?: string;
}

export class CreateBudgetPlanHandler implements ICommandHandler<
  CreateBudgetPlanCommand,
  CommandResult<BudgetPlanDTO>
> {
  constructor(private readonly budgetPlanService: BudgetPlanService) {}

  async handle(
    command: CreateBudgetPlanCommand
  ): Promise<CommandResult<BudgetPlanDTO>> {
    const dto = await this.budgetPlanService.createPlan({
      workspaceId: command.workspaceId,
      name: command.name,
      periodType: command.periodType,
      description: command.description,
      startDate: command.startDate,
      endDate: command.endDate,
      createdBy: command.createdBy,
    });
    return CommandResult.success(dto);
  }
}
