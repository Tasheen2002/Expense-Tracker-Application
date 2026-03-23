import { SpendingLimitService } from '../services/spending-limit.service';

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
  CommandResult<void>
> {
  constructor(private readonly limitService: SpendingLimitService) {}

  async handle(
    command: UpdateSpendingLimitCommand
  ): Promise<CommandResult<void>> {
    try {
      
          await this.limitService.updateSpendingLimit(
            command.limitId,
            command.workspaceId,
            {
              limitAmount: command.limitAmount,
            }
          );
          return CommandResult.success();
        
    } catch (error: unknown) {
      return CommandResult.fromError(error);
    }
  }
}
