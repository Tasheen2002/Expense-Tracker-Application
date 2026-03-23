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
  CommandResult<{ budgetId: string }>
> {
  constructor(private readonly budgetService: BudgetService) {}

  async handle(
    command: CreateBudgetCommand
  ): Promise<CommandResult<{ budgetId: string }>> {
    try {
      
          const budget = await this.budgetService.createBudget(command);
          return CommandResult.success({ budgetId: budget.getId().getValue() });
        
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
