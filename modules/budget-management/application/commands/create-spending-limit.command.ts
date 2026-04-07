import { SpendingLimitService } from '../services/spending-limit.service';
import { SpendingLimitDTO } from '../../domain/entities/spending-limit.entity';
import { BudgetPeriodType } from '../../domain/enums/budget-period-type';

import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

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
  CommandResult<SpendingLimitDTO>
> {
  constructor(private readonly limitService: SpendingLimitService) {}

  async handle(
    command: CreateSpendingLimitCommand
  ): Promise<CommandResult<SpendingLimitDTO>> {
    const dto = await this.limitService.createSpendingLimit(command);
    return CommandResult.success(dto);
  }
}
