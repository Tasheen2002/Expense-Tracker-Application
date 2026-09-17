import { SpendingLimitService } from '../services/spending-limit.service';
import { SpendingLimitDTO } from '../../domain/entities/spending-limit.entity';
import { BudgetPeriodType } from '../../domain/enums/budget-period-type';

import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface CreateSpendingLimitCommand extends ICommand {
  readonly workspaceId: string;
  readonly userId?: string;
  readonly categoryId?: string;
  readonly limitAmount: number | string;
  readonly currency: string;
  readonly periodType: BudgetPeriodType;
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
