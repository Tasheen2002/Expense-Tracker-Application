import { ReceiptService } from '../services/receipt.service';
import { Receipt } from '../../domain/entities/receipt.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '../../../../apps/api/src/shared/application';

export interface ProcessReceiptCommand extends ICommand {
  receiptId: string;
  workspaceId: string;
  userId: string;
  ocrText?: string;
  ocrConfidence?: number;
}

export class ProcessReceiptHandler implements ICommandHandler<
  ProcessReceiptCommand,
  CommandResult<void>
> {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(command: ProcessReceiptCommand): Promise<CommandResult<void>> {
    await this.receiptService.processReceipt(
      command.receiptId,
      command.workspaceId,
      command.userId,
      command.ocrText,
      command.ocrConfidence
    );
    return CommandResult.success();
  }
}
