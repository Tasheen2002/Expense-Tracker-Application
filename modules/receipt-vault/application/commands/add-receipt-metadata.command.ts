import { ReceiptService } from '../services/receipt.service';
import { ReceiptMetadata } from '../../domain/entities/receipt-metadata.entity';
import {
  ICommand,
  ICommandHandler,
} from '../../../../packages/core/src/application/cqrs';
import { CommandResult } from '../../../../packages/core/src/application/command-result';

export interface AddReceiptMetadataCommand extends ICommand {
  receiptId: string;
  workspaceId: string;
  userId: string;
  merchantName?: string;
  merchantAddress?: string;
  merchantPhone?: string;
  merchantTaxId?: string;
  transactionDate?: Date;
  transactionTime?: string;
  subtotal?: number | string;
  taxAmount?: number | string;
  tipAmount?: number | string;
  totalAmount?: number | string;
  currency?: string;
  paymentMethod?: string;
  lastFourDigits?: string;
  invoiceNumber?: string;
  poNumber?: string;
  notes?: string;
}

export class AddReceiptMetadataHandler implements ICommandHandler<
  AddReceiptMetadataCommand,
  CommandResult<{ metadataId: string }>
> {
  constructor(private readonly receiptService: ReceiptService) {}

  async handle(
    command: AddReceiptMetadataCommand
  ): Promise<CommandResult<{ metadataId: string }>> {
    const metadata = await this.receiptService.addMetadata(command);
    return CommandResult.success({ metadataId: metadata.getId().getValue() });
  }
}
