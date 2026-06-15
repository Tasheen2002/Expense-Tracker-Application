import { ReceiptService } from '../services/receipt.service';
import { Receipt } from '../../domain/entities/receipt.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface UnlinkReceiptFromExpenseCommand extends ICommand {
  readonly receiptId: string;
  readonly workspaceId: string;
  readonly userId: string;
}

export class UnlinkReceiptFromExpenseHandler implements ICommandHandler<
  UnlinkReceiptFromExpenseCommand,
  CommandResult<void>
> {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(
    command: UnlinkReceiptFromExpenseCommand
  ): Promise<CommandResult<void>> {
    await this.receiptService.unlinkFromExpense(
      command.receiptId,
      command.workspaceId,
      command.userId
    );
    return CommandResult.success();
  }
}
