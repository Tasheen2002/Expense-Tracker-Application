import { SpendingLimitService } from '../services/spending-limit.service';

import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface DeleteSpendingLimitCommand extends ICommand {
  readonly limitId: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class DeleteSpendingLimitHandler implements ICommandHandler<
  DeleteSpendingLimitCommand,
  CommandResult<void>
> {
  constructor(private readonly limitService: SpendingLimitService) {}

  async handle(
    command: DeleteSpendingLimitCommand
  ): Promise<CommandResult<void>> {
    await this.limitService.deleteSpendingLimit(
      command.limitId,
      command.workspaceId,
      command.userId
    );
    return CommandResult.success(undefined);
  }
}
