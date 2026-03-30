import { ReceiptService } from '../services/receipt.service';
import { Receipt } from '../../domain/entities/receipt.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface VerifyReceiptCommand extends ICommand {
  receiptId: string;
  workspaceId: string;
  userId: string;
}

export class VerifyReceiptHandler implements ICommandHandler<
  VerifyReceiptCommand,
  CommandResult<void>
> {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(command: VerifyReceiptCommand): Promise<CommandResult<void>> {
    await this.receiptService.verifyReceipt(
      command.receiptId,
      command.workspaceId,
      command.userId
    );
    return CommandResult.success();
  }
}
