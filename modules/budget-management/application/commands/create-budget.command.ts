import { BudgetService } from '../services/budget.service';
import { BudgetDTO } from '../../domain/entities/budget.entity';
import { BudgetPeriodType } from '../../domain/enums/budget-period-type';

import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface CreateBudgetCommand extends ICommand {
  workspaceId: string;
  name: string;
  description?: string;
  totalAmount: number | string;
  currency: string;
  periodType: BudgetPeriodType;
  startDate: Date;
  endDate?: Date;
  createdBy: string;
  isRecurring?: boolean;
  rolloverUnused?: boolean;
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
