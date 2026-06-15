import { ReceiptService } from '../services/receipt.service';
import { ReceiptDTO } from '../../domain/entities/receipt.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface LinkReceiptToExpenseCommand extends ICommand {
  readonly receiptId: string;
  readonly expenseId: string;
  readonly workspaceId: string;
  readonly userId: string;
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
