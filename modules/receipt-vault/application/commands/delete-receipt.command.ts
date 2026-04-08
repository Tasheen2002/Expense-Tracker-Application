import { ReceiptService } from '../services/receipt.service';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface DeleteReceiptCommand extends ICommand {
  receiptId: string;
  workspaceId: string;
  userId: string;
  permanent?: boolean;
}

export class DeleteReceiptHandler implements ICommandHandler<
  DeleteReceiptCommand,
  CommandResult<void>
> {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(command: DeleteReceiptCommand): Promise<CommandResult<void>> {
    await this.receiptService.deleteReceipt(
      command.receiptId,
      command.workspaceId,
      command.userId,
      command.permanent || false,
    );
    return CommandResult.success();
  }
}
