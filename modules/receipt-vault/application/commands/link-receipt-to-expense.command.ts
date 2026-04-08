import { ReceiptService } from '../services/receipt.service';
import { ReceiptDTO } from '../../domain/entities/receipt.entity';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface LinkReceiptToExpenseCommand extends ICommand {
  receiptId: string;
  expenseId: string;
  workspaceId: string;
  userId: string;
}

export class LinkReceiptToExpenseHandler implements ICommandHandler<
  LinkReceiptToExpenseCommand,
  CommandResult<ReceiptDTO>
> {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(
    command: LinkReceiptToExpenseCommand
  ): Promise<CommandResult<ReceiptDTO>> {
    const receiptDTO = await this.receiptService.linkToExpense(
      command.receiptId,
      command.expenseId,
      command.workspaceId,
      command.userId
    );
    return CommandResult.success(receiptDTO);
  }
}
