import { ReceiptService } from '../services/receipt.service';
import { ReceiptDTO } from '../../domain/entities/receipt.entity';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface ProcessReceiptCommand extends ICommand {
  receiptId: string;
  workspaceId: string;
  userId: string;
  ocrText?: string;
  ocrConfidence?: number;
}

export class ProcessReceiptHandler implements ICommandHandler<
  ProcessReceiptCommand,
  CommandResult<ReceiptDTO>
> {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(command: ProcessReceiptCommand): Promise<CommandResult<ReceiptDTO>> {
    const receiptDTO = await this.receiptService.processReceipt(
      command.receiptId,
      command.workspaceId,
      command.userId,
      command.ocrText,
      command.ocrConfidence
    );
    return CommandResult.success(receiptDTO);
  }
}
