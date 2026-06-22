import { BudgetPlanService } from '../services/budget-plan.service';
import { BudgetPlanDTO } from '../../domain/entities/budget-plan.entity';
import { PeriodType } from '../../domain/enums/period-type.enum';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface CreateBudgetPlanCommand extends ICommand {
  readonly workspaceId: string;
  readonly name: string;
  readonly periodType: PeriodType;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly createdBy: string;
  readonly description?: string;
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
