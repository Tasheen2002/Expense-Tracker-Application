import { BudgetService } from '../services/budget.service';
import { BudgetDTO } from '../../domain/entities/budget.entity';
import { BudgetPeriodType } from '../../domain/enums/budget-period-type';

import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface CreateBudgetCommand extends ICommand {
  readonly workspaceId: string;
  readonly name: string;
  readonly description?: string;
  readonly totalAmount: number | string;
  readonly currency: string;
  readonly periodType: BudgetPeriodType;
  readonly startDate: Date;
  readonly endDate?: Date;
  readonly createdBy: string;
  readonly isRecurring?: boolean;
  readonly rolloverUnused?: boolean;
}

export class CreateBudgetHandler implements ICommandHandler<
  CreateBudgetCommand,
  CommandResult<BudgetDTO>
> {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(
    command: CreateBudgetCommand
  ): Promise<CommandResult<BudgetDTO>> {
    const budget = await this.budgetService.createBudget(command);
    return CommandResult.success(budget);
  }
}
