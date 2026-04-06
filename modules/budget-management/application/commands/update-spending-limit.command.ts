import { SpendingLimitService } from '../services/spending-limit.service';

import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface UpdateSpendingLimitCommand extends ICommand {
  limitId: string;
  workspaceId: string;
  userId?: string;
  limitAmount?: number | string;
}

export class UpdateSpendingLimitHandler implements ICommandHandler<
  UpdateSpendingLimitCommand,
  CommandResult<void>
> {
  constructor(private readonly limitService: SpendingLimitService) {}

  async handle(
    command: UpdateSpendingLimitCommand
  ): Promise<CommandResult<void>> {
    await this.limitService.updateSpendingLimit(
      command.limitId,
      command.workspaceId,
      {
        limitAmount: command.limitAmount,
      }
    );
    return CommandResult.success();
  }
}
