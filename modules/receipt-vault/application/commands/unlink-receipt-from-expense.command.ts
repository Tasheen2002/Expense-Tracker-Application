import { ReceiptService } from '../services/receipt.service';
import { Receipt } from '../../domain/entities/receipt.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface UnlinkReceiptFromExpenseCommand extends ICommand {
  receiptId: string;
  workspaceId: string;
  userId: string;
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
