import { SpendingLimitService } from '../services/spending-limit.service';
import { SpendingLimit } from '../../domain/entities/spending-limit.entity';

import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface UpdateSpendingLimitCommand extends ICommand {
  limitId: string;
  workspaceId: string;
  userId?: string;
  limitAmount?: number | string;
}

export class UpdateSpendingLimitHandler implements ICommandHandler<
  UpdateSpendingLimitCommand,
  CommandResult<SpendingLimit>
> {
  constructor(private readonly limitService: SpendingLimitService) {}

  async handle(
    command: UpdateSpendingLimitCommand
  ): Promise<CommandResult<SpendingLimit>> {
    const limit = await this.limitService.updateSpendingLimit(
      command.limitId,
      command.workspaceId,
      {
        limitAmount: command.limitAmount,
      }
    );
    return CommandResult.success(limit);
  }
}
