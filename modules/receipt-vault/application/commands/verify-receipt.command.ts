import { ReceiptService } from '../services/receipt.service';
import { Receipt } from '../../domain/entities/receipt.entity';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

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
