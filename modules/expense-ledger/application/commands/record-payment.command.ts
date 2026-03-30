import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';
import { ExpenseSplitService } from '../services/expense-split.service';

export interface RecordPaymentCommand extends ICommand {
  readonly settlementId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly amount: number;
}

export class RecordPaymentHandler implements ICommandHandler<
  RecordPaymentCommand,
  CommandResult<void>
> {
  constructor(private readonly splitService: ExpenseSplitService) {}

  async handle(command: RecordPaymentCommand): Promise<CommandResult<void>> {
    await this.splitService.recordPayment(command);
    return CommandResult.success();
  }
}
