import { ReceiptService } from '../services/receipt.service';
import { Receipt } from '../../domain/entities/receipt.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface LinkReceiptToExpenseCommand extends ICommand {
  receiptId: string;
  expenseId: string;
  workspaceId: string;
  userId: string;
}

export class LinkReceiptToExpenseHandler implements ICommandHandler<
  LinkReceiptToExpenseCommand,
  CommandResult<void>
> {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(
    command: LinkReceiptToExpenseCommand
  ): Promise<CommandResult<void>> {
    await this.receiptService.linkToExpense(
      command.receiptId,
      command.expenseId,
      command.workspaceId,
      command.userId
    );
    return CommandResult.success();
  }
}
