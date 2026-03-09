import { SpendingLimitService } from '../services/spending-limit.service';
import { SpendingLimit } from '../../domain/entities/spending-limit.entity';
import { BudgetPeriodType } from '../../domain/enums/budget-period-type';

import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface CreateSpendingLimitCommand extends ICommand {
  workspaceId: string;
  userId?: string;
  categoryId?: string;
  limitAmount: number | string;
  currency: string;
  periodType: BudgetPeriodType;
}

export class CreateSpendingLimitHandler implements ICommandHandler<
  CreateSpendingLimitCommand,
  CommandResult<SpendingLimit>
> {
  constructor(private readonly limitService: SpendingLimitService) {}

  async handle(
    command: CreateSpendingLimitCommand
  ): Promise<CommandResult<SpendingLimit>> {
    const limit = await this.limitService.createSpendingLimit(command);
    return CommandResult.success(limit);
  }
}
