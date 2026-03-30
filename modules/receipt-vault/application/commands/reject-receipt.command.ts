import { ReceiptService } from '../services/receipt.service';
import { Receipt } from '../../domain/entities/receipt.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface RejectReceiptCommand extends ICommand {
  receiptId: string;
  workspaceId: string;
  userId: string;
  reason?: string;
}

export class RejectReceiptHandler implements ICommandHandler<
  RejectReceiptCommand,
  CommandResult<void>
> {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(command: RejectReceiptCommand): Promise<CommandResult<void>> {
    await this.receiptService.rejectReceipt(
      command.receiptId,
      command.workspaceId,
      command.userId,
      command.reason
    );
    return CommandResult.success();
  }
}
