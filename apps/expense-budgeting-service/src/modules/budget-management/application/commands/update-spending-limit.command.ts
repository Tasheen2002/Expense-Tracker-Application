import { SpendingLimitService } from '../services/spending-limit.service';
import { SpendingLimitDTO } from '../../domain/entities/spending-limit.entity';

import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface UpdateSpendingLimitCommand extends ICommand {
  readonly limitId: string;
  readonly workspaceId: string;
  readonly userId?: string;
  readonly limitAmount?: number | string;
}

export class UpdateSpendingLimitHandler implements ICommandHandler<
  UpdateSpendingLimitCommand,
  CommandResult<SpendingLimitDTO>
> {
  constructor(private readonly limitService: SpendingLimitService) {}

  async handle(
    command: UpdateSpendingLimitCommand
  ): Promise<CommandResult<SpendingLimitDTO>> {
    const dto = await this.limitService.updateSpendingLimit(
      command.limitId,
      command.workspaceId,
      {
        limitAmount: command.limitAmount,
      }
    );
    return CommandResult.success(dto);
  }
}
