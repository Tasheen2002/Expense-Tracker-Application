import { ReceiptService } from '../services/receipt.service';
import { ReceiptDTO } from '../../domain/entities/receipt.entity';
import { ReceiptType } from '../../domain/enums/receipt-type';
import { ICommand, ICommandHandler, CommandResult } from '@core/application/cqrs';

export interface UploadReceiptCommand extends ICommand {
  readonly workspaceId: string;
  readonly userId: string;
  readonly originalName: string;
  readonly fileContent: string;
  readonly mimeType: string;
  readonly receiptType?: ReceiptType;
}

export class UploadReceiptHandler implements ICommandHandler<UploadReceiptCommand, CommandResult<ReceiptDTO>> {
  constructor(private readonly receiptService: ReceiptService) {}
  async handle(command: UploadReceiptCommand): Promise<CommandResult<ReceiptDTO>> {
    return CommandResult.success(await this.receiptService.uploadReceipt(command));
  }
}
