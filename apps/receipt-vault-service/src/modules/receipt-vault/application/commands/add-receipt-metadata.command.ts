import { ReceiptService } from '../services/receipt.service';
import { ReceiptMetadataDTO } from '../../domain/entities/receipt-metadata.entity';
import {
  ICommand,
  ICommandHandler,
  CommandResult,
} from '@core/application/cqrs';

export interface AddReceiptMetadataCommand extends ICommand {
  readonly receiptId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly merchantName?: string;
  readonly merchantAddress?: string;
  readonly merchantPhone?: string;
  readonly merchantTaxId?: string;
  readonly transactionDate?: Date;
  readonly transactionTime?: string;
  readonly subtotal?: number | string;
  readonly taxAmount?: number | string;
  readonly tipAmount?: number | string;
  readonly totalAmount?: number | string;
  readonly currency?: string;
  readonly paymentMethod?: string;
  readonly lastFourDigits?: string;
  readonly invoiceNumber?: string;
  readonly poNumber?: string;
  readonly notes?: string;
}

export class AddReceiptMetadataHandler implements ICommandHandler<
  AddReceiptMetadataCommand,
  CommandResult<ReceiptMetadataDTO>
> {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(
    command: AddReceiptMetadataCommand
  ): Promise<CommandResult<ReceiptMetadataDTO>> {
    const metadataDTO = await this.receiptService.addMetadata(command);
    return CommandResult.success(metadataDTO);
  }
}
