import { ReceiptService } from '../services/receipt.service';
import { ReceiptDTO } from '../../domain/entities/receipt.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface ProcessReceiptCommand extends ICommand {
  readonly receiptId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly ocrText?: string;
  readonly ocrConfidence?: number;
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
