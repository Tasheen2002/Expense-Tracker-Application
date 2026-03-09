import { BudgetService } from '../services/budget.service';
import { Budget } from '../../domain/entities/budget.entity';
import { BudgetPeriodType } from '../../domain/enums/budget-period-type';

import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

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
  CommandResult<Budget>
> {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(command: CreateBudgetCommand): Promise<CommandResult<Budget>> {
    const budget = await this.budgetService.createBudget(command);
    return CommandResult.success(budget);
  }
}
