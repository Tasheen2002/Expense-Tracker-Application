import { ReceiptService } from '../services/receipt.service';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface DeleteReceiptCommand extends ICommand {
  readonly receiptId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly permanent?: boolean;
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
