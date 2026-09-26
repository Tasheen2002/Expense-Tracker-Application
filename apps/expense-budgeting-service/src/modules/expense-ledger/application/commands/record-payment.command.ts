import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';
import { ExpenseSplitService } from '../services/expense-split.service';
import { SplitSettlementDTO } from '../../domain/entities/split-settlement.entity';

export interface RecordPaymentCommand extends ICommand {
  readonly settlementId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly amount: number;
}

export class RecordPaymentHandler implements ICommandHandler<
  RecordPaymentCommand,
  CommandResult<SplitSettlementDTO>
> {
  constructor(private readonly splitService: ExpenseSplitService) {}

  async handle(command: RecordPaymentCommand): Promise<CommandResult<SplitSettlementDTO>> {
    const settlement = await this.splitService.recordPayment(command);
    return CommandResult.success(settlement);
  }
}
